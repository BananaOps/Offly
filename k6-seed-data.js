import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.1'],
  },
};

// Données de test
const departments = [
  { name: 'Engineering' },
  { name: 'Product' },
  { name: 'Sales' },
  { name: 'Marketing' },
  { name: 'HR' },
];

const teams = [
  { name: 'Backend Team', departmentName: 'Engineering' },
  { name: 'Frontend Team', departmentName: 'Engineering' },
  { name: 'DevOps Team', departmentName: 'Engineering' },
  { name: 'Product Design', departmentName: 'Product' },
  { name: 'Product Management', departmentName: 'Product' },
  { name: 'Sales EMEA', departmentName: 'Sales' },
  { name: 'Sales Americas', departmentName: 'Sales' },
  { name: 'Content Marketing', departmentName: 'Marketing' },
  { name: 'Growth Marketing', departmentName: 'Marketing' },
  { name: 'Recruitment', departmentName: 'HR' },
];

const users = [
  { name: 'Alice Johnson', email: 'alice@offly.io', country: 'FR', department: 'Engineering', team: 'Backend Team' },
  { name: 'Bob Smith', email: 'bob@offly.io', country: 'FR', department: 'Engineering', team: 'Backend Team' },
  { name: 'Charlie Brown', email: 'charlie@offly.io', country: 'FR', department: 'Engineering', team: 'Frontend Team' },
  { name: 'Diana Prince', email: 'diana@offly.io', country: 'FR', department: 'Engineering', team: 'Frontend Team' },
  { name: 'Eve Wilson', email: 'eve@offly.io', country: 'FR', department: 'Engineering', team: 'DevOps Team' },
  { name: 'Frank Miller', email: 'frank@offly.io', country: 'US', department: 'Product', team: 'Product Design' },
  { name: 'Grace Lee', email: 'grace@offly.io', country: 'US', department: 'Product', team: 'Product Management' },
  { name: 'Henry Davis', email: 'henry@offly.io', country: 'GB', department: 'Sales', team: 'Sales EMEA' },
  { name: 'Iris Martinez', email: 'iris@offly.io', country: 'US', department: 'Sales', team: 'Sales Americas' },
  { name: 'Jack Taylor', email: 'jack@offly.io', country: 'FR', department: 'Marketing', team: 'Content Marketing' },
  { name: 'Kate Anderson', email: 'kate@offly.io', country: 'FR', department: 'Marketing', team: 'Growth Marketing' },
  { name: 'Leo Thomas', email: 'leo@offly.io', country: 'FR', department: 'HR', team: 'Recruitment' },
];

// Jours fériés 2026
const holidays2026FR = [
  { date: '2026-01-01', name: "Jour de l'an", country: 'FR', year: 2026 },
  { date: '2026-04-06', name: 'Lundi de Pâques', country: 'FR', year: 2026 },
  { date: '2026-05-01', name: 'Fête du Travail', country: 'FR', year: 2026 },
  { date: '2026-05-08', name: 'Victoire 1945', country: 'FR', year: 2026 },
  { date: '2026-05-14', name: 'Ascension', country: 'FR', year: 2026 },
  { date: '2026-05-25', name: 'Lundi de Pentecôte', country: 'FR', year: 2026 },
  { date: '2026-07-14', name: 'Fête Nationale', country: 'FR', year: 2026 },
  { date: '2026-08-15', name: 'Assomption', country: 'FR', year: 2026 },
  { date: '2026-11-01', name: 'Toussaint', country: 'FR', year: 2026 },
  { date: '2026-11-11', name: 'Armistice 1918', country: 'FR', year: 2026 },
  { date: '2026-12-25', name: 'Noël', country: 'FR', year: 2026 },
];

const holidays2026US = [
  { date: '2026-01-01', name: "New Year's Day", country: 'US', year: 2026 },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day', country: 'US', year: 2026 },
  { date: '2026-02-16', name: "Presidents' Day", country: 'US', year: 2026 },
  { date: '2026-05-25', name: 'Memorial Day', country: 'US', year: 2026 },
  { date: '2026-07-04', name: 'Independence Day', country: 'US', year: 2026 },
  { date: '2026-09-07', name: 'Labor Day', country: 'US', year: 2026 },
  { date: '2026-10-12', name: 'Columbus Day', country: 'US', year: 2026 },
  { date: '2026-11-11', name: 'Veterans Day', country: 'US', year: 2026 },
  { date: '2026-11-26', name: 'Thanksgiving', country: 'US', year: 2026 },
  { date: '2026-12-25', name: 'Christmas Day', country: 'US', year: 2026 },
];

const holidays2026GB = [
  { date: '2026-01-01', name: "New Year's Day", country: 'GB', year: 2026 },
  { date: '2026-04-03', name: 'Good Friday', country: 'GB', year: 2026 },
  { date: '2026-04-06', name: 'Easter Monday', country: 'GB', year: 2026 },
  { date: '2026-05-04', name: 'Early May Bank Holiday', country: 'GB', year: 2026 },
  { date: '2026-05-25', name: 'Spring Bank Holiday', country: 'GB', year: 2026 },
  { date: '2026-08-31', name: 'Summer Bank Holiday', country: 'GB', year: 2026 },
  { date: '2026-12-25', name: 'Christmas Day', country: 'GB', year: 2026 },
  { date: '2026-12-28', name: 'Boxing Day (substitute)', country: 'GB', year: 2026 },
];

function createDepartments() {
  console.log('Creating departments...');
  const createdDepts = {};

  departments.forEach(dept => {
    const res = http.post(`${API_BASE}/departments`, JSON.stringify(dept), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(res, { 'department created': (r) => r.status === 200 });

    if (res.status === 200) {
      const data = JSON.parse(res.body);
      // Response is wrapped: { department: { id, name } }
      createdDepts[dept.name] = data.department.id;
      console.log(`✓ Created department: ${dept.name} (${data.department.id})`);
    } else {
      console.log(`✗ Failed to create department: ${dept.name} - ${res.status} ${res.body}`);
    }
  });

  return createdDepts;
}

function createTeams(deptIds) {
  console.log('Creating teams...');
  const createdTeams = {};

  teams.forEach(team => {
    const deptId = deptIds[team.departmentName];
    if (!deptId) {
      console.log(`✗ Department not found for team: ${team.name}`);
      return;
    }

    const res = http.post(
      `${API_BASE}/teams`,
      JSON.stringify({ name: team.name, departmentId: deptId }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, { 'team created': (r) => r.status === 200 });

    if (res.status === 200) {
      const data = JSON.parse(res.body);
      // Response is wrapped: { team: { id, name, departmentId } }
      createdTeams[team.name] = data.team.id;
      console.log(`✓ Created team: ${team.name} (${data.team.id})`);
    } else {
      console.log(`✗ Failed to create team: ${team.name} - ${res.status} ${res.body}`);
    }
  });

  return createdTeams;
}

function createUsers(deptIds, teamIds) {
  console.log('Creating users...');
  const createdUsers = [];

  users.forEach(user => {
    const res = http.post(
      `${API_BASE}/users`,
      JSON.stringify({ name: user.name, email: user.email, country: user.country }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    check(res, { 'user created': (r) => r.status === 200 });

    if (res.status === 200) {
      const data = JSON.parse(res.body);
      // Response is wrapped: { user: { id, name, email, ... } }
      const created = data.user;
      createdUsers.push({ ...created, department: user.department, team: user.team });
      console.log(`✓ Created user: ${user.name} (${created.id})`);

      // Assigner au département
      const deptId = deptIds[user.department];
      if (deptId) {
        const res2 = http.post(
          `${API_BASE}/users/${created.id}/department`,
          JSON.stringify({ userId: created.id, departmentId: deptId }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (res2.status === 200) {
          console.log(`  ✓ Assigned to department: ${user.department}`);
        }
      }

      // Assigner à l'équipe
      const teamId = teamIds[user.team];
      if (teamId) {
        const res3 = http.post(
          `${API_BASE}/users/${created.id}/team`,
          JSON.stringify({ userId: created.id, teamId: teamId }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (res3.status === 200) {
          console.log(`  ✓ Assigned to team: ${user.team}`);
        }
      }
    } else {
      console.log(`✗ Failed to create user: ${user.name} - ${res.status} ${res.body}`);
    }
  });

  return createdUsers;
}

function createHolidays() {
  console.log('Creating holidays...');

  const allHolidays = [...holidays2026FR, ...holidays2026US, ...holidays2026GB];

  allHolidays.forEach(holiday => {
    const res = http.post(`${API_BASE}/holidays`, JSON.stringify(holiday), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(res, { 'holiday created': (r) => r.status === 200 });

    if (res.status === 200) {
      console.log(`✓ Created holiday: ${holiday.name} (${holiday.country})`);
    } else {
      console.log(`✗ Failed to create holiday: ${holiday.name} - ${res.status} ${res.body}`);
    }
  });
}

function createAbsences(createdUsers) {
  console.log('Creating sample absences...');

  const absenceTypes = ['Congés payés', 'RTT', 'Maladie', 'Congé sans solde'];
  const statuses = ['pending', 'approved', 'rejected'];

  createdUsers.forEach(user => {
    const numAbsences = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < numAbsences; i++) {
      const startDate = new Date(2026, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const duration = Math.floor(Math.random() * 10) + 1;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      const res = http.post(
        `${API_BASE}/absences`,
        JSON.stringify({
          userId: user.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reason: absenceTypes[Math.floor(Math.random() * absenceTypes.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      check(res, { 'absence created': (r) => r.status === 200 });

      if (res.status === 200) {
        console.log(`✓ Created absence for ${user.name}: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}`);
      }
    }
  });
}

export default function () {
  console.log('=== Starting Offly Data Seeding ===\n');

  const healthRes = http.get(`${API_BASE}/health`);
  check(healthRes, { 'API is healthy': (r) => r.status === 200 });

  if (healthRes.status !== 200) {
    console.error('API is not accessible!');
    return;
  }
  console.log('✓ API is healthy\n');

  const deptIds = createDepartments();
  sleep(1);

  const teamIds = createTeams(deptIds);
  sleep(1);

  const createdUsers = createUsers(deptIds, teamIds);
  sleep(1);

  createHolidays();
  sleep(1);

  createAbsences(createdUsers);

  const allHolidays = [...holidays2026FR, ...holidays2026US, ...holidays2026GB];
  console.log('\n=== Data Seeding Complete ===');
  console.log(`Created:`);
  console.log(`  - ${Object.keys(deptIds).length} departments`);
  console.log(`  - ${Object.keys(teamIds).length} teams`);
  console.log(`  - ${createdUsers.length} users`);
  console.log(`  - ${allHolidays.length} holidays`);
  console.log(`\nAccess the application at ${BASE_URL}`);
  console.log(`API documentation: ${BASE_URL}/docs`);
}
