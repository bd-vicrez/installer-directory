"""Evidence gates; external page/applicant text never becomes an instruction."""
import hashlib, http.client, ipaddress, json, re, socket, ssl
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit, urljoin

ACTOR = 'Vicrez Installer Agent (AI)'
POLICY = 'installer-review-v1'
APP_FIELDS = ('id','business_name','street_address','city','state','zip_code','phone',
              'email','website','install_capabilities','details','consent_at','consent_version')
BLOCKED_HOSTS = {'localhost','example.com','example.org','example.net','vicrez.com',
                'google.com','facebook.com','instagram.com','yelp.com','zendesk.com',
                'wixsite.com','wordpress.com','godaddysites.com'}
SERVICES = {
 'vinyl-wrap': r'\b(?:vehicle|car|auto|commercial|color.change|fleet)\s+(?:vinyl\s+)?wrap',
 'ppf': r'\b(?:ppf|paint protection film|clear bra)\b',
 'window-tint': r'\b(?:window tint|window film|automotive tint|ceramic tint)',
 'body-kits': r'\b(?:body kits?|widebody|body panel|bumper installation)\b',
 'wheels-tires': r'\b(?:tire mounting|wheel installation|tires and wheels|wheels and tires|tire installation)\b',
 'other': r'\b(?:detailing|automotive|vehicle|car|truck|window tint)\b',
}
def norm(v): return ' '.join(re.findall(r'[a-z0-9]+',str(v or '').lower()))
def phone(v):
 n=re.sub(r'\D','',str(v or ''))
 return n[-10:] if len(n)==10 or (len(n)==11 and n.startswith('1')) else ''
def host(url):
 try:return (urlsplit(url).hostname or '').lower().removeprefix('www.')
 except ValueError:return ''
def fingerprint(app):
 data={k:app.get(k) for k in APP_FIELDS}
 if data.get('consent_at'):data['consent_at']=utc(data['consent_at']).isoformat(timespec='milliseconds')
 return hashlib.sha256(json.dumps(data,sort_keys=True,default=str).encode()).hexdigest()
def utc(v):
 if isinstance(v,datetime):return v.replace(tzinfo=timezone.utc) if not v.tzinfo else v
 return datetime.fromisoformat(str(v).replace('Z','+00:00')).replace(tzinfo=timezone.utc) if '+' not in str(v) else datetime.fromisoformat(str(v))
def address_words(v):
 aliases={'street':'st','road':'rd','drive':'dr','avenue':'ave','lane':'ln','boulevard':'blvd','way':'way',
          'north':'n','south':'s','east':'e','west':'w','court':'ct','highway':'hwy','place':'pl'}
 return ' '.join(aliases.get(t,t) for t in norm(v).split())
def street_base(v):return re.split(r'\b(?:suite|ste|unit|apt|apartment)\b|#',v,flags=re.I)[0].strip()
def same_name(a,b):
 def parts(x):return [v for v in norm(x).split() if v not in ['llc','inc','incorporated','ltd','the']]
 return parts(a)==parts(b)
def address_on_page(app,text):
 n=address_words(text);street=address_words(street_base(app['street_address']))
 # A trailing standalone suite letter is commonly omitted from Maps.
 street=re.sub(r' [a-z]$','',street)
 return bool(street and street in n and re.search(r'\b'+re.escape(app['zip_code'][:5])+r'\b',n))
def exact_duplicate(app,row):
 return (same_name(app['business_name'],row['business_name']) and phone(app['phone']) and
         phone(app['phone'])==phone(row['phone']) and host(app['website']) and
         host(app['website'])==host(row['website']) and app['state']==row['state'])
def review_capabilities(app):
 caps=app['install_capabilities']
 # An empty catch-all is not a service claim. Publish only the named categories.
 if len(caps)>1 and not (app.get('details',{}).get('other_service') or '').strip():
  return [c for c in caps if c!='other']
 return caps

class PageText(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.parts=[];self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style','noscript','template'):self.skip+=1
  d=dict(attrs)
  if tag=='a' and d.get('href'):self.links.append(d['href'])
 def handle_endtag(self,tag):
  if tag in ('script','style','noscript','template') and self.skip:self.skip-=1
 def handle_data(self,data):
  if not self.skip:self.parts.append(data)
def public_target(url,resolver=None):
 p=urlsplit(url)
 if p.scheme!='https' or not p.hostname or p.username or p.password or p.port not in (None,443):raise ValueError('unsafe_website')
 h=p.hostname.lower()
 if h.endswith(('.local','.internal','.localhost')) or any(h==x or h.endswith('.'+x) for x in BLOCKED_HOSTS):raise ValueError('shared_or_private_website')
 try:ipaddress.ip_address(h)
 except ValueError:pass
 else:raise ValueError('numeric_website_host')
 addresses={r[4][0] for r in (resolver or socket.getaddrinfo)(h,443,type=socket.SOCK_STREAM)}
 if not addresses or any(not ipaddress.ip_address(ip).is_global for ip in addresses):raise ValueError('private_website_address')
 return p,sorted(addresses)[0]
class PinnedHTTPS(http.client.HTTPSConnection):
 def __init__(self,hostname,ip):super().__init__(hostname,443,timeout=15,context=ssl.create_default_context());self.ip=ip
 def connect(self):self.sock=self._context.wrap_socket(socket.create_connection((self.ip,443),self.timeout),server_hostname=self.host)
def fetch_page(url,root):
 for _ in range(4):
  p,ip=public_target(url)
  if host(url)!=root:raise ValueError('offsite_redirect')
  con=PinnedHTTPS(p.hostname,ip)
  try:
   con.request('GET',urlunsplit(('','',p.path or '/',p.query,'')),headers={'User-Agent':'Vicrez-Installer-Verification/1.0','Accept':'text/html','Accept-Encoding':'identity'})
   r=con.getresponse()
   if r.status in (301,302,303,307,308):url=urljoin(url,r.getheader('Location',''));continue
   if r.status!=200 or 'text/html' not in (r.getheader('Content-Type') or ''):raise ValueError('website_unavailable')
   raw=r.read(2000001)
   if len(raw)>2000000:raise ValueError('website_too_large')
   parser=PageText();parser.feed(raw.decode('utf-8',errors='replace'))
   return {'url':url,'text':' '.join(' '.join(parser.parts).split())[:45000],
           'links':parser.links[:300],'sha256':hashlib.sha256(raw).hexdigest()}
  finally:con.close()
 raise ValueError('redirect_limit')
def collect_pages(url):
 if url.startswith('http://'):url='https://'+url[7:]
 root=host(url);pages=[fetch_page(url,root)]
 links=[urljoin(url,'/')]+[urljoin(url,x) for x in pages[0]['links'] if re.search(r'contact|about|location|service',x,re.I)]
 for target in dict.fromkeys(links):
  if len(pages)>=4:break
  if host(target)!=root or target in [p['url'] for p in pages]:continue
  try:pages.append(fetch_page(target,root))
  except (ValueError,OSError,http.client.HTTPException):pass
 return pages
def evidence_checks(app,ev):
 pages=ev.get('pages',[]);text=' '.join(p['text'] for p in pages);n=norm(text)
 published={phone(m[0]) for m in re.finditer(r'(?:\+?1[\s.-]*)?\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}',text)}
 place=ev.get('place') or {};geo=ev.get('location') or {}
 bname=norm(app['business_name']);pt=norm(place.get('displayName',{}).get('text'))
 same_place=bool(bname and (same_name(bname,pt) or bname in pt))
 website=host(app['website']);site_name=bool(bname and bname in n)
 # Camel-case business names also appear with spaces on official sites.
 if not site_name:site_name=bool(bname and bname.replace(' ','') in n.replace(' ',''))
 checks={
  'listing_consent':bool(app.get('consent_at') and app.get('consent_version')),
  'business_name_on_website':site_name,
  'business_phone_on_website':bool(phone(app['phone']) and phone(app['phone']) in published),
  'public_business_address':address_on_page(app,text),
  'google_business_match':same_place and place.get('businessStatus')=='OPERATIONAL',
  'google_phone_match':bool(phone(app['phone']) and phone(app['phone'])==phone(place.get('nationalPhoneNumber'))),
  'google_website_match':bool(website and website==host(place.get('websiteUri',''))),
  'google_address_match':address_on_page(app,place.get('formattedAddress','')),
  'geocoded_full_address':geo.get('eligible') is True and address_on_page(app,geo.get('formatted_address','')),
  'services_on_website':bool(review_capabilities(app)) and all(k in SERVICES and re.search(SERVICES[k],text,re.I) for k in review_capabilities(app)),
 }
 return checks
def ai_valid(result,pages,capabilities):
 if not isinstance(result,dict):return False
 if result.get('identity_supported') is not True or result.get('safe_public_address') is not True or result.get('contradictions')!=[]:return False
 if not isinstance(result.get('supported_services'),list) or not set(capabilities)<=set(result['supported_services']):return False
 refs=result.get('evidence')
 if not isinstance(refs,list) or not 2<=len(refs)<=3:return False
 for e in refs:
  if not isinstance(e,dict) or not isinstance(e.get('quote'),str) or not 15<=len(e['quote'])<=240:return False
  if not any(e.get('url')==p['url'] and norm(e['quote']) in norm(p['text']) for p in pages):return False
 return True
def decide(app,ev,duplicates):
 exact=[d for d in duplicates if exact_duplicate(app,d)]
 if len(exact)==1:return {'status':'rejected','reason':'already_listed','duplicate':{k:exact[0][k] for k in ['id','slug','business_name']}}
 if duplicates:return {'status':'needs_information','reason':'possible_duplicate','missing':['duplicate_confirmation']}
 checks=evidence_checks(app,ev)
 checks['ai_evidence_review']=ai_valid(ev.get('ai'),ev.get('pages',[]),review_capabilities(app))
 missing=[k for k,v in checks.items() if not v]
 return {'status':'needs_information' if missing else 'approved','reason':'evidence_incomplete' if missing else 'verified_public_business','checks':checks,'missing':missing,'approved_capabilities':review_capabilities(app) if not missing else []}
def group_inquiries(rows):
 groups=[]
 for r in sorted(rows,key=lambda x:x['submission_id']):
  key=(r['email'].strip().lower(),r['service'],r['vehicle_year'],norm(r['vehicle_make']),norm(r['vehicle_model']))
  found=next((g for g in reversed(groups) if g['key']==key and abs((utc(r['created_at'])-utc(g['rows'][0]['created_at'])).total_seconds())<=7*86400),None)
  if found:found['rows'].append(r)
  else:groups.append({'key':key,'rows':[r]})
 return groups
