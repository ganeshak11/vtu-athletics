'use client';

interface Props {
  collegeName: string;
  district: string;
  collegeCode: string;
  pedName: string;
  menCount: number;
  womenCount: number;
  markedAt: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function AttendanceCertificate({
  collegeName,
  district,
  collegeCode,
  pedName,
  menCount,
  womenCount,
  markedAt,
}: Props) {
  const issued = new Date(markedAt);
  const issueDate = `${pad2(issued.getDate())}/${pad2(issued.getMonth() + 1)}/${issued.getFullYear()}`;
  const collegeLine = district && !collegeName.toLowerCase().includes(district.toLowerCase())
    ? `${collegeName}, ${district}`
    : collegeName;

  return (
    <div className="att-page">
      <div className="att-actions no-print">
        <div>
          <h1 className="att-heading">Attendance Certificate</h1>
          <p className="att-note">Your contingent&apos;s attendance has been recorded by the Registration Desk.</p>
        </div>
        <button type="button" className="att-print" onClick={() => window.print()} id="btn-print-attendance-certificate">
          🖨️ Download / Print (PDF)
        </button>
      </div>

      <div className="att-paper" id="printable-attendance-certificate">
        {/* Letterhead */}
        <div className="att-letterhead">
          <img src="/logo.jpeg" alt="Dr. ACSCE logo" className="att-logo" />
          <div className="att-letterhead-text">
            <div className="att-host-name">Dr. ACS COLLEGE OF ENGINEERING</div>
            <div className="att-host-sub">(Affiliated to Visvesvaraya Technological University, Belagavi)</div>
            <div className="att-host-sub">Kambipura, Mysore Road, Bengaluru – 560074, Karnataka, India</div>
          </div>
          {/* Spacer the width of the logo keeps the letterhead text centred (ACSCE logo only) */}
          <div className="att-logo-spacer" aria-hidden="true" />
        </div>

        <div className="att-ref-row">
          <span>Ref No.: AURA26/ATT/{collegeCode}</span>
          <span>Date: {issueDate}</span>
        </div>

        <div className="att-titles">
          <div className="att-title">ATTENDANCE CERTIFICATE</div>
          <div className="att-subtitle">
            VTU 28<sup>th</sup> State Level Inter Collegiate Athletic Meet 2026-27
          </div>
          <div className="att-dates">
            (7<sup>th</sup> – 10<sup>th</sup> December 2026)
          </div>
          <div className="att-dates">(Dr. ACS AURA 2026)</div>
        </div>

        <p className="att-body">
          This is to certify that <strong>{pedName || '______________________'}</strong>, Physical Education Director,
          representing <strong>{collegeLine}</strong> has attended the &ldquo;VTU 28<sup>th</sup> State Level Inter
          Collegiate Athletic Meet 2026-27&rdquo; organised by <strong>&ldquo;Dr. ACS College of Engineering</strong>,
          Bengaluru 560074&rdquo; from 7<sup>th</sup> December 2026 (Monday) to 10<sup>th</sup> December 2026 (Thursday)
          along with <strong className="att-u">{pad2(menCount)}</strong> men and{' '}
          <strong className="att-u">{pad2(womenCount)}</strong> women participants.
        </p>
        <p className="att-body">They have actively participated / attended on 07 / 08 / 09 / 10 December 2026.</p>

        <div className="att-signatures">
          <div className="att-sig">
            <div className="att-sig-space" />
            <div className="att-sig-title">Organising Secretary</div>
            <div className="att-sig-sub">Physical Education Director</div>
            <div className="att-sig-sub">Dr. ACS College of Engineering</div>
          </div>
          <div className="att-sig">
            <div className="att-sig-space" />
            <div className="att-sig-title">Principal</div>
            <div className="att-sig-sub">Dr. ACS College of Engineering</div>
            <div className="att-sig-sub">Bengaluru – 560074</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .att-page {
          width: 100%;
          max-width: 860px;
          margin: 1.5rem auto 3rem;
          padding: 0 16px;
        }
        .att-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .att-heading {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
        }
        .att-note {
          font-size: 0.85rem;
          color: #15803d;
          font-weight: 600;
        }
        .att-print {
          background: #1e3a8a;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.65rem 1.2rem;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .att-print:hover {
          background: #1e40af;
        }
        .att-paper {
          background: #fff;
          color: #000;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: clamp(1.25rem, 5vw, 3rem);
          font-family: 'Times New Roman', Times, serif;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        }
        .att-letterhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          border-bottom: 2px solid #000;
          padding-bottom: 0.6rem;
        }
        .att-logo {
          height: clamp(48px, 10vw, 72px);
          width: auto;
          object-fit: contain;
        }
        .att-logo-spacer {
          width: clamp(48px, 10vw, 72px);
          flex-shrink: 0;
        }
        .att-letterhead-text {
          text-align: center;
          flex: 1;
        }
        .att-host-name {
          font-size: clamp(1rem, 3.4vw, 1.5rem);
          font-weight: 900;
          letter-spacing: 0.02em;
        }
        .att-host-sub {
          font-size: clamp(0.65rem, 1.8vw, 0.8rem);
        }
        .att-ref-row {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.85rem;
          margin: 0.6rem 0 1.5rem;
        }
        .att-titles {
          text-align: center;
          margin-bottom: 1.75rem;
        }
        .att-title {
          font-size: clamp(1.2rem, 4vw, 1.6rem);
          font-weight: 900;
          text-decoration: underline;
          letter-spacing: 0.04em;
        }
        .att-subtitle {
          font-size: clamp(0.95rem, 3vw, 1.15rem);
          font-weight: 700;
          margin-top: 0.3rem;
        }
        .att-dates {
          font-size: 0.95rem;
          font-weight: 700;
        }
        .att-body {
          font-size: clamp(0.95rem, 2.6vw, 1.1rem);
          line-height: 2;
          text-align: justify;
          text-indent: 3rem;
          margin-bottom: 0.75rem;
        }
        .att-u {
          text-decoration: underline;
        }
        .att-signatures {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          margin-top: 4rem;
        }
        .att-sig {
          text-align: center;
          min-width: 0;
        }
        .att-sig-space {
          height: 48px;
          border-bottom: 1px solid #000;
          margin-bottom: 0.35rem;
          width: 200px;
          max-width: 100%;
        }
        .att-sig-title {
          font-weight: 800;
          font-size: 0.95rem;
        }
        .att-sig-sub {
          font-size: 0.8rem;
        }
        @media (max-width: 520px) {
          .att-signatures {
            flex-direction: column;
            align-items: center;
            margin-top: 2.5rem;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .att-page {
            margin: 0;
            padding: 0;
            max-width: none;
          }
          .att-paper {
            border: none;
            box-shadow: none;
            padding: 0;
          }
        }
      `}</style>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 18mm;
          }
          /* Print only the certificate, not the portal banner / navigation around it */
          body * {
            visibility: hidden !important;
          }
          #printable-attendance-certificate,
          #printable-attendance-certificate * {
            visibility: visible !important;
          }
          #printable-attendance-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
