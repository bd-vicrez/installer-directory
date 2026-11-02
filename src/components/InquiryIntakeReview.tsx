"use client";
import { useRef, useState } from "react";
export type IntakeReview = {state:string;reason:string;source:string;version:number;reviewed_by?:string};
export default function InquiryIntakeReview({id,review,refresh}:{id:number;review:IntakeReview;refresh:()=>void}) {
  const [note,setNote]=useState(""),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const attempt=useRef<{key:string;id:string}|null>(null);
  async function save(action:string) {
    if (busy || !confirmed || note.trim().length<10) return;
    const key=JSON.stringify({action,note,version:review.version});
    if (!attempt.current || attempt.current.key!==key) attempt.current={key,id:crypto.randomUUID()};
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/admin/inquiries/review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({submission_id:id,action,note,version:review.version,action_id:attempt.current.id,confirmed})});
      const data=await r.json(); if(!r.ok)throw new Error(data.error || "Review not saved.");
      setNote("");setConfirmed(false);attempt.current=null;refresh();
    } catch(e) {setError(e instanceof Error?e.message:"Review not confirmed. Refresh before retrying.");} finally{setBusy(false);}
  }
  return <section className="border rounded-lg bg-amber-50 p-4 space-y-3">
    <p><strong>Intake review: {review.state.replaceAll("_"," ")}</strong> · {review.reason.replaceAll("_"," ")}</p>
    <p className="text-sm">Held and quarantined requests cannot trigger automated customer or shop messages. Confirm the real project and contact permission before releasing a request.</p>
    {review.source==="legacy" && <p className="text-sm">Legacy requests require a new customer form with recorded sharing consent. They cannot be released automatically.</p>}
    <label className="block text-sm">Review evidence and next step<textarea className="input w-full" value={note} onChange={e=>setNote(e.target.value)} maxLength={1000}/></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this request. For release, I verified a real project, customer contact permission and the stated recipient scope.</label>
    <div className="flex flex-wrap gap-2">
      {review.source!=="legacy" && <button className="btn-primary" disabled={busy || !confirmed || note.trim().length<10} onClick={()=>save("release")}>Release verified request</button>}
      <button className="btn-secondary" disabled={busy || !confirmed || note.trim().length<10} onClick={()=>save("hold")}>Keep on hold</button>
      <button className="btn-secondary" disabled={busy || !confirmed || note.trim().length<10} onClick={()=>save("quarantine")}>Quarantine invalid request</button>
    </div>{error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
