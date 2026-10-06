"use client";

import { useState } from "react";
import type { BuilderData, ProjectPatch } from "./shared";

function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Two optional parts, each closed until the customer wants it, so the step never asks for everything at once. */
export function Guests({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project } = data;
  const [venue, setVenue] = useState(project.venue ?? "");
  const [dress, setDress] = useState(project.dressCode ?? "");
  const [map, setMap] = useState(project.mapUrl ?? "");
  const [bank, setBank] = useState(project.giftBank ?? "");
  const [acctName, setAcctName] = useState(project.giftAccountName ?? "");
  const [acctNo, setAcctNo] = useState(project.giftAccountNumber ?? "");
  const hasDay = !!(project.eventTime || project.venue || project.dressCode || project.mapUrl);
  const hasGift = !!(project.giftBank || project.giftAccountNumber || project.giftAccountName);
  const [dayOpen, setDayOpen] = useState(hasDay);
  const [giftOpen, setGiftOpen] = useState(hasGift);
  const giftShown = !!(project.giftBank && project.giftAccountNumber && project.giftAccountName);

  return (
    <div className="stack">
      <div className="part">
        <div className="part-h">
          <div><h3>Where and when</h3><p>For a party or ceremony guests will attend. Your website shows the time, the venue and a map button, so nobody has to ask in the group chat.</p></div>
          {!dayOpen ? <button type="button" className="btn small" onClick={() => setDayOpen(true)}>Add</button> : hasDay ? <span className="chip ok">On your website</span> : null}
        </div>
        {dayOpen ? (
          <div className="stack">
            <label className="field">
              <span>Start time</span>
              <input type="time" value={project.eventTime ?? ""} onChange={(e) => void save({ eventTime: e.target.value })} />
              <div className="hint">{project.eventTime ? `Guests will see "${clock(project.eventTime)}" next to the date, and the countdown runs to this time.` : "The time guests should arrive."}</div>
            </label>
            <label className="field">
              <span>Venue</span>
              <input type="text" value={venue} maxLength={140} placeholder="The Monarch Event Centre, Lekki" onChange={(e) => setVenue(e.target.value)} onBlur={() => venue !== (project.venue ?? "") && void save({ venue })} />
            </label>
            <label className="field">
              <span>Map link</span>
              <input type="url" value={map} placeholder="Paste a Google Maps link" onChange={(e) => setMap(e.target.value)} onBlur={() => map !== (project.mapUrl ?? "") && void save({ mapUrl: map })} />
              <div className="hint">In Google Maps, find the venue, tap Share, then Copy link. Guests get an "Open in Maps" button.</div>
            </label>
            <label className="field">
              <span>Colors of the day or dress code</span>
              <input type="text" value={dress} maxLength={80} placeholder="Emerald green and gold" onChange={(e) => setDress(e.target.value)} onBlur={() => dress !== (project.dressCode ?? "") && void save({ dressCode: dress })} />
              <div className="hint">Your website designer also uses these colors.</div>
            </label>
          </div>
        ) : null}
      </div>

      <div className="part">
        <div className="part-h">
          <div><h3>Gifts</h3><p>If guests may want to send money, add an account. Your website shows it with a copy button. The money goes straight to that account, never through Orikly.</p></div>
          {!giftOpen ? <button type="button" className="btn small" onClick={() => setGiftOpen(true)}>Add</button> : giftShown ? <span className="chip ok">On your website</span> : null}
        </div>
        {giftOpen ? (
          <div className="stack">
            <label className="field">
              <span>Bank</span>
              <input type="text" value={bank} maxLength={60} placeholder="GTBank" onChange={(e) => setBank(e.target.value)} onBlur={() => bank !== (project.giftBank ?? "") && void save({ giftBank: bank })} />
            </label>
            <label className="field">
              <span>Account number</span>
              <input type="text" inputMode="numeric" maxLength={10} value={acctNo} onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, ""))} onBlur={() => acctNo !== (project.giftAccountNumber ?? "") && (acctNo.length === 10 || acctNo.length === 0) && void save({ giftAccountNumber: acctNo })} />
              <div className="hint">10 digits.</div>
            </label>
            <label className="field">
              <span>Account name</span>
              <input type="text" value={acctName} maxLength={80} onChange={(e) => setAcctName(e.target.value)} onBlur={() => acctName !== (project.giftAccountName ?? "") && void save({ giftAccountName: acctName })} />
            </label>
            {!giftShown ? <div className="hint">Fill all three and the gift section appears on your website. Clear them to remove it.</div> : null}
          </div>
        ) : null}
      </div>

      <p className="hint" style={{ margin: 0 }}>Neither applies? Tap Next. You can come back any time, even after your website is live.</p>
    </div>
  );
}
