// หน้าบัตรเชิญสาธารณะ: แขกเปิดจากลิงก์ที่เจ้าภาพส่งให้ (#invite/<token>) ไม่ต้องล็อกอิน
import React, { useEffect, useState } from "react";
import { PublicInvite, errMsg, hostFetch, thLongDate } from "../hostApi";
import "./InvitePage.css";

const TYPE_LABEL: Record<string, string> = { BATHING: "พิธีสรงน้ำศพ", CHANT: "สวดพระอภิธรรม", CREMATION: "พิธีฌาปนกิจ" };

export const InvitePage: React.FC<{ token: string; onNavigateHome: () => void }> = ({ token, onNavigateHome }) => {
  const [data, setData] = useState<PublicInvite | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    hostFetch<PublicInvite>(`/public/invite/${encodeURIComponent(token)}`, { auth: false })
      .then(setData)
      .catch((err) => setError(errMsg(err, "ไม่พบบัตรเชิญ")));
  }, [token]);

  const dates = data ? [...new Set(data.schedule.map((s) => s.date))] : [];

  return (
    <div className="invite-wrap">
      {!data && !error && <div className="invite-card">กำลังโหลดบัตรเชิญ...</div>}
      {error && (
        <div className="invite-card">
          <h2>ไม่พบบัตรเชิญ</h2>
          <p>{error}</p>
          <button className="invite-btn" onClick={onNavigateHome}>กลับหน้าหลัก</button>
        </div>
      )}
      {data && (
        <div className="invite-card">
          <div className="invite-lotus">✿</div>
          <div className="invite-pre">บันทึกความอาลัย</div>
          <h1 className="invite-name">{data.deceasedName}</h1>
          <p className="invite-text">
            ขอเรียนเชิญร่วมพิธีบำเพ็ญกุศลและพิธีฌาปนกิจ
            <br />
            ณ {data.hallName} {data.templeName}
          </p>
          <p className="invite-range">
            สวดพระอภิธรรม {thLongDate(data.startISO)}
            {data.nights > 1 ? ` เป็นเวลา ${data.nights} คืน` : ""}
            <br />
            พิธีฌาปนกิจ {thLongDate(data.cremationISO)}
          </p>

          {dates.length > 0 && (
            <div className="invite-sched">
              <h3>กำหนดการ</h3>
              {dates.map((d) => (
                <div key={d} className="invite-day">
                  <b>{thLongDate(d)}</b>
                  {data.schedule.filter((s) => s.date === d).map((s, i) => (
                    <div key={i} className="invite-row">
                      <span>{s.time ? `${s.time} น.` : ""}</span>
                      <span>{TYPE_LABEL[s.type] || s.title}{s.type === "CHANT" ? ` (${s.title.replace("สวดพระอภิธรรม ", "")})` : ""}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <p className="invite-host">เจ้าภาพ: {data.hostName}</p>
          <div className="invite-actions">
            <button className="invite-btn" onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</button>
            <button className="invite-btn ghost" onClick={onNavigateHome}>เกี่ยวกับ FOMS</button>
          </div>
        </div>
      )}
    </div>
  );
};
