import { Link } from 'react-router-dom'
import { AlertCircle, ArrowUpRight, Phone, ShieldCheck } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="floodops-minimal-landing">
      {/* Self-contained styling for high-end minimalist presentation */}
      <style>{`
        .floodops-minimal-landing {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: radial-gradient(circle at 50% 35%, #ffffff 0%, #f6f8fb 60%, #edf2f7 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          user-select: none;
        }

        /* Ambient subtle backdrop glow */
        .floodops-minimal-landing::before {
          content: "";
          position: absolute;
          width: 720px;
          height: 720px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, rgba(239, 68, 68, 0.02) 40%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* 3-Column Balanced Layout: Left Phao | Center Stage | Right Phao */
        .stage-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1260px;
          flex: 1;
          padding: 0 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Flank Floating Item (Left: Phao ring, Right: Áo phao) */
        .flank-item {
          flex: 0 0 260px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
        }

        .flank-left {
          opacity: 0;
          animation:
            entranceLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards,
            naturalFloatLeft 7.2s ease-in-out infinite 1.4s;
        }

        .flank-right {
          opacity: 0;
          animation:
            entranceRight 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards,
            naturalFloatRight 7.8s ease-in-out infinite 1.5s;
        }

        .flank-img {
          width: 240px;
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 20px 32px rgba(15, 23, 42, 0.12));
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease;
        }

        .flank-item:hover .flank-img {
          transform: scale(1.05) translateY(-6px);
          filter: drop-shadow(0 26px 42px rgba(15, 23, 42, 0.18));
        }

        /* Center Content Stage */
        .center-stage {
          flex: 1;
          max-width: 640px;
          margin: 0 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        /* Animated Logo & Brand */
        .brand-cluster {
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0;
          animation: entranceLogo 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        }

        .brand-emblem-wrap {
          position: relative;
          width: 96px;
          height: 96px;
          border-radius: 28px;
          background: #ffffff;
          box-shadow: 0 10px 32px -6px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }

        .brand-emblem-wrap:hover {
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 20px 44px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.06);
        }

        .brand-logo-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
        }

        .brand-name {
          font-size: 42px;
          font-weight: 700;
          letter-spacing: -0.035em;
          color: #090d16;
          margin: 0 0 6px 0;
          line-height: 1.1;
        }

        .brand-tagline-heading {
          font-size: 15px;
          font-weight: 600;
          color: #2563eb;
          margin: 0 0 14px 0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .brand-brief {
          font-size: 15.5px;
          line-height: 1.55;
          color: #64748b;
          max-width: 480px;
          margin: 0 0 36px 0;
          font-weight: 400;
          opacity: 0;
          animation: entranceFade 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
        }

        /* Two Balanced Minimalist Buttons - Enlarged and Proportionate */
        .buttons-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          width: 100%;
          opacity: 0;
          animation: entranceButtons 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;
        }

        .minimal-btn {
          flex: 1;
          max-width: 280px;
          height: 72px;
          padding: 0 22px;
          background: #ffffff;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-decoration: none;
          color: #0f172a;
          box-shadow: 0 6px 18px -4px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.07);
          transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .minimal-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 32px -6px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.12);
        }

        .minimal-btn:active {
          transform: translateY(-1px);
        }

        .btn-inner {
          display: flex;
          align-items: center;
          gap: 14px;
          text-align: left;
        }

        .btn-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s ease;
          flex-shrink: 0;
        }

        .minimal-btn:hover .btn-icon-wrap {
          transform: scale(1.08);
        }

        .icon-emergency {
          background: #fef2f2;
          color: #dc2626;
        }

        .icon-ops {
          background: #eff6ff;
          color: #2563eb;
        }

        .btn-texts {
          display: flex;
          flex-direction: column;
        }

        .btn-main-title {
          font-size: 15.5px;
          font-weight: 600;
          color: #0f172a;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }

        .btn-sub-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 400;
          margin-top: 2px;
        }

        .btn-arrow {
          color: #94a3b8;
          transition: transform 0.25s ease, color 0.25s ease;
          flex-shrink: 0;
        }

        .minimal-btn:hover .btn-arrow {
          transform: translate(2px, -2px);
          color: #0f172a;
        }

        .btn-emergency:hover {
          box-shadow: 0 16px 32px -6px rgba(220, 38, 38, 0.14), 0 0 0 1px rgba(220, 38, 38, 0.25);
        }

        .btn-ops:hover {
          box-shadow: 0 16px 32px -6px rgba(37, 99, 235, 0.14), 0 0 0 1px rgba(37, 99, 235, 0.25);
        }

        /* Bottom Centered Phone Container */
        .bottom-hotline-container {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px 0 28px 0;
          z-index: 10;
        }

        .bottom-phone-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px 22px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 9999px;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);
          text-decoration: none;
          color: #475569;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.01em;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          opacity: 0;
          animation: entranceFade 1s cubic-bezier(0.16, 1, 0.3, 1) 0.6s forwards;
        }

        .bottom-phone-pill:hover {
          color: #0f172a;
          background: #ffffff;
          border-color: rgba(15, 23, 42, 0.18);
          box-shadow: 0 10px 26px -4px rgba(15, 23, 42, 0.1);
          transform: translateY(-2px);
        }

        .phone-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
          display: inline-block;
        }

        .phone-number-highlight {
          color: #0f172a;
          font-weight: 600;
          letter-spacing: 0.03em;
          font-size: 14.5px;
        }

        /* Human-tuned entrance & floating keyframes */
        @keyframes entranceLogo {
          0% {
            opacity: 0;
            transform: translateY(-22px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes entranceFade {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes entranceButtons {
          0% {
            opacity: 0;
            transform: translateY(22px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes entranceLeft {
          0% {
            opacity: 0;
            transform: translateX(-40px) translateY(10px) rotate(-6deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0) rotate(0deg);
          }
        }

        @keyframes entranceRight {
          0% {
            opacity: 0;
            transform: translateX(40px) translateY(10px) rotate(6deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0) rotate(0deg);
          }
        }

        /* Natural organic gentle floating (gentle ocean swell rhythm) */
        @keyframes naturalFloatLeft {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(2.5deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }

        @keyframes naturalFloatRight {
          0% {
            transform: translateY(-12px) rotate(2deg);
          }
          50% {
            transform: translateY(8px) rotate(-2deg);
          }
          100% {
            transform: translateY(-12px) rotate(2deg);
          }
        }

        /* Responsive adaptations */
        @media (max-width: 980px) {
          .stage-container {
            flex-direction: column;
            justify-content: center;
            padding: 30px 20px;
          }

          .flank-item {
            display: none;
          }

          .center-stage {
            margin: 0;
            max-width: 100%;
          }

          .buttons-row {
            flex-direction: column;
            gap: 14px;
          }

          .minimal-btn {
            max-width: 320px;
            width: 100%;
          }

          .bottom-hotline-container {
            padding: 16px 0 20px 0;
          }
        }
      `}</style>

      <div className="stage-container">
        {/* Left Flank: Floating Rescue Ring (Phao tròn) */}
        <div className="flank-item flank-left" aria-hidden="true">
          <img
            src="/assets/phao-ring.png"
            alt="Floating rescue ring"
            className="flank-img"
          />
        </div>

        {/* Center Stage: Logo, FloodOps, Subtitle, Brief, and Two Balanced Buttons */}
        <div className="center-stage">
          <div className="brand-cluster">
            <div className="brand-emblem-wrap">
              <img
                src="/assets/logo.png"
                alt="FloodOps Emblem"
                className="brand-logo-img"
              />
            </div>

            <h1 className="brand-name">FloodOps</h1>
            <h2 className="brand-tagline-heading">Flood Emergency Coordination</h2>
          </div>

          <p className="brand-brief">
            Direct emergency coordination bridging flood-affected citizens, autonomous aerial drone reconnaissance, and tactical watercraft rescue teams.
          </p>

          <div className="buttons-row">
            {/* Left Button: Report an Emergency */}
            <Link
              to="/report"
              className="minimal-btn btn-emergency"
              aria-label="Report an Emergency - Citizen SOS Portal"
            >
              <div className="btn-inner">
                <div className="btn-icon-wrap icon-emergency">
                  <AlertCircle size={20} aria-hidden="true" />
                </div>
                <div className="btn-texts">
                  <span className="btn-main-title">Report an Emergency</span>
                  <span className="btn-sub-label">Citizen SOS Portal</span>
                </div>
              </div>
              <ArrowUpRight size={19} className="btn-arrow" aria-hidden="true" />
            </Link>

            {/* Right Button: Rescue Operations */}
            <Link
              to="/access"
              className="minimal-btn btn-ops"
              aria-label="Rescue Operations - Dispatch Console"
            >
              <div className="btn-inner">
                <div className="btn-icon-wrap icon-ops">
                  <ShieldCheck size={20} aria-hidden="true" />
                </div>
                <div className="btn-texts">
                  <span className="btn-main-title">Rescue Operations</span>
                  <span className="btn-sub-label">Dispatch Console</span>
                </div>
              </div>
              <ArrowUpRight size={19} className="btn-arrow" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Right Flank: Floating Rescue Vest (Áo phao) */}
        <div className="flank-item flank-right" aria-hidden="true">
          <img
            src="/assets/phao-vest.png"
            alt="Floating rescue vest"
            className="flank-img"
          />
        </div>
      </div>

      {/* Perfectly Centered Bottom Hotline Bar */}
      <div className="bottom-hotline-container">
        <a
          href="tel:4252464623"
          className="bottom-phone-pill"
          aria-label="Call Emergency Hotline: 425 246 4623"
        >
          <span className="phone-pulse-dot" aria-hidden="true" />
          <Phone size={14} style={{ color: '#0f172a' }} aria-hidden="true" />
          <span>Hotline:</span>
          <span className="phone-number-highlight">425 246 4623</span>
        </a>
      </div>
    </div>
  )
}
