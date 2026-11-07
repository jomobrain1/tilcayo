import { useState } from 'react';
import { Badge, Button, Card } from '@tilcayo/ui';

// Presentation-only examples; these records are never written to the API.
const featured = [
  { name: 'Agnes Njeri', initials: 'AN', role: 'Admin', title: 'System Administrator', school: 'Sunrise Primary' },
  { name: 'James Mwangi', initials: 'JM', role: 'Teacher', title: 'Senior Teacher', school: 'Woodlands Academy' },
  { name: 'David Kimani', initials: 'DK', role: 'Student', title: 'Form 2 Student', school: 'Ridgeview High School' },
  { name: 'Sarah Muthoni', initials: 'SM', role: 'Teacher', title: 'Mathematics Teacher', school: 'Woodlands Academy' },
  { name: 'Lilian Wanjiku', initials: 'LW', role: 'Teacher', title: 'Science Teacher', school: 'Maplecrest School' },
  { name: 'Tom Ochieng', initials: 'TO', role: 'Parent', title: 'Parent Representative', school: 'Greenfield Secondary' },
];
const recent = [
  { name: 'David Kimani', initials: 'DK', role: 'Student', joined: 'Joined 2 hours ago' },
  { name: 'Caroline Mesago', initials: 'CM', role: 'Parent', joined: 'Joined 1 day ago' },
  { name: 'Brian Otieno', initials: 'BO', role: 'Student', joined: 'Joined 2 days ago' },
  { name: 'Sarah Muthoni', initials: 'SM', role: 'Teacher', joined: 'Joined 3 days ago' },
  { name: 'Agnes Njeri', initials: 'AN', role: 'Admin', joined: 'Joined 4 days ago' },
];

function DemoRole({ role }: { role: string }) {
  return <Badge className={'tl-admin-demo-role-' + role.toLowerCase()}>{role}</Badge>;
}

export function DemoUserHighlights() {
  const [allProfiles, setAllProfiles] = useState(false);
  const [allJoins, setAllJoins] = useState(false);
  return <aside className="tl-admin-user-highlights" aria-label="Sample community highlights">
    <Card className="tl-admin-highlight-card">
      <header><div><h2>Featured profiles</h2><p>Meet members of your school community.</p></div><Button variant="outline" aria-expanded={allProfiles} onClick={() => setAllProfiles(!allProfiles)}>{allProfiles ? 'Show less' : 'View all'}</Button></header>
      <ul className="tl-admin-user-preview">{featured.slice(0, allProfiles ? featured.length : 4).map(profile => <li key={profile.name}>
        <span className="tl-admin-avatar" aria-hidden="true">{profile.initials}</span>
        <div><strong>{profile.name}</strong><small>{profile.title}</small><small>{profile.school}</small></div>
        <DemoRole role={profile.role} />
      </li>)}</ul>
    </Card>
    <Card className="tl-admin-highlight-card">
      <header><div><h2>Recent joins</h2><p>Latest members of the school community.</p></div><Button variant="outline" aria-expanded={allJoins} onClick={() => setAllJoins(!allJoins)}>{allJoins ? 'Show less' : 'View all'}</Button></header>
      <ul className="tl-admin-user-preview">{recent.slice(0, allJoins ? recent.length : 3).map(profile => <li key={profile.name}>
        <span className="tl-admin-avatar" aria-hidden="true">{profile.initials}</span>
        <div><strong>{profile.name}</strong><small>{profile.joined}</small></div>
        <DemoRole role={profile.role} />
      </li>)}</ul>
    </Card>
  </aside>;
}
