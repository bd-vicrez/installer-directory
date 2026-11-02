"""Conservative human routing for installation-inquiry correspondence."""
import re

TAG='installer_quote_inquiry'
COMPLETE_TAG='installer_quote_review_complete'

def needs_installer_review(subject,body):
    text=(str(subject)+'\n'+str(body)).lower()[:30000]
    if re.search(r'\bVZ-\d{1,15}\b',text,re.I):return True
    if 'quotes@vicrez.com' in text:return True
    phrases=('installation inquiry','installer directory','installer network','installation quote',
             'quote request for','lip installation','respond to this inquiry')
    return any(p in text for p in phrases) and any(p in text for p in ('install','quote','shop','vicrez'))
