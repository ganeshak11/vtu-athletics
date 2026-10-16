import Link from 'next/link';

export const metadata = {
  title: 'Championship Leaderboard & Medal Tally — VTU SportsOS',
};

export default function LeaderboardPage() {
  return (
    <div className="container" id="leaderboard-page">
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.75rem' }}>
          Inter-Collegiate Championship Standings
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
          Official team championship points table and Best Athlete trophy rankings. Points are awarded: 1st (8 pts), 2nd (7 pts), 3rd (6 pts), 4th (5 pts), 5th (4 pts), 6th (3 pts).
        </p>

        <div className="glass-panel" style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent-gold)' }}>
            Overall College Standings (Awaiting Day 1 Events)
          </h2>
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No confirmed event results yet. Standings will dynamically update live as judges finalize track and field marks.
          </div>
        </div>

        <div style={{ marginTop: '2.5rem' }}>
          <Link href="/" className="btn btn-secondary">
            ← Return to Home Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
