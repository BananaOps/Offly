import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8
nst API_BASE = `${BASE_URL}/api/v1`;

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
  { name: 'Henry Davis', email: 'henry@offly.io', country: 'UK', department: 'Sales', team: 'Sales EMEA' },
  { name: 'Iris Martinez', email: 'iris@offly.io', country: 'US', department: 'Sales', team: 'Sales Americas' },
  { name: 'Jack Taylor', email: 'jack@offly.io', country: 'FR', department: 'Marketing', team: 'Content Marketing' },
  { name: 'Kate Anderson', email: 'kate@offly.io', country: 'FR', department: 'Marketing', team: 'Growth Marketing' },
  { name: 'Leo Thomas', email: 'leo@offly.io', country: 'FR', department: 'HR', team: 'Recruitment' },
];

const holidays2025FR = [
  { date: '2025-01-01', name: 'Jour de l\'an', country: 'FR', year: 2025 },
  { date: '2025-04-21', name: 'Lundi de Pâques', country: 'FR', year: 2025 },
  { date: '2025-05-01', name: 'Fête du Travail', country: 'FR', year: 2025 },
  { date: '2025-05-08', name: 'Victoire 1945', country: 'FR', year: 2025 },
  { date: '2025-05-29', name: 'Ascension', country: 'FR', year: 2025 },
  { date: '2025-06-09', name: 'Lundi de Pentecôte', country: 'FR', year: 2025 },
  { date: '2025-07-14', name: 'Fête Nationale', country: 'FR', year: 2025 },
  { date: '2025-08-15', name: 'Assomption', country: 'FR', year: 2025 },
  { date: '2025-11-01', name: 'Toussaint', country: 'FR', year: 2025 },
  { date: '2025-11-11', name: 'Armistice 1918', country: 'FR', year: 2025 },
  { date: '2025-12-25', name: 'Noël', country: 'FR', year: 2025 },
];

const holidays2025US = [
  { date: '2025-01-01', name: 'New Year\'s Day', country: 'US', year: 2025 },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day', country: 'US', year: 2025 },
  { date: '2025-02-17', name: 'Presidents\' Day', country: 'US', year: 2025 },
  { date: '2025-05-26', name: 'Memorial Day', country: 'US', year: 2025 },
  { date: '2025-07-04', name: 'Independence Day', country: 'US', year: 2025 },
  { date: '2025-09-01', name: 'Labor Day', country: 'US', year: 2025 },
  { date: '2025-10-13', name: 'Columbus Day', country: 'US', year: 2025 },
  { date: '2025-11-11', name: 'Veterans Day', country: 'US', year: 2025 },
  { date: '2025-11-27', name: 'Thanksgiving', country: 'US', year: 2025 },
  { date: '2025-12-25', name: 'Christmas Day', country: 'US', year: 2025 },
];

const holidays2025UK = [
  { date: '2025-01-01', name: 'New Year\'s Day', country: 'UK', year: 2025 },
  { date: '2025-04-18', name: 'Good Friday', country: 'UK', year: 2025 },
  { date: '2025-04-21', name: 'Easter Monday', country: 'UK', year: 2025 },
  { date: '2025-05-05', name: 'Early May Bank Holiday', country: 'UK', year: 2025 },
  { date: '2025-05-26', name: 'Spring Bank Holiday', country: 'UK', year: 2025 },
  { date: '2025-08-25', name: 'Summer Bank Holiday', country: 'UK', year: 2025 },
  { date: '2025-12-25', name: 'Christmas Day', country: 'UK', year: 2025 },
  { date: '2025-12-26', name: 'Boxing Day', country: 'UK', year: 2025 },
];

function createDepartments() {
  console.log('Creating departments...');
  const createdDepts = {};
  
  departments.forEach(dept => {
    const payload = JSON.stringify(dept);
    const res = http.post(`${API_BASE}/departments`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(res, {
      'department created': (r) => r.status === 200,
    });
    
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      createdDepts[dept.name] = data.id;
      console.log(`✓ Created department: ${dept.name} (${data.id})`);
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
    
    const payload = JSON.stringify({
      name: team.name,
      department_id: deptId,
    });
    
    const res = http.post(`${API_BASE}/teams`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(res, {
      'team created': (r) => r.status === 200,
    });
    
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      createdTeams[team.name] = data.id;
      console.log(`✓ Created team: ${team.name} (${data.id})`);
    }
  });
  
  return createdTeams;
}

function createUsers(deptIds, teamIds) {
  console.log('Creating users...');
  const createdUsers = [];
  
  users.forEach(user => {
    const payload = JSON.stringify({
      name: user.name,
      email: user.email,
      country: user.country,
    });
    
    const res = http.post(`${API_BASE}/users`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(res, {
      'user created': (r) => r.status === 200,
    });
    
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      createdUsers.push({ ...data, department: user.department, team: user.team });
      console.log(`✓ Created user: ${user.name} (${data.id})`);
      
      // Assigner au département
      const deptId = deptIds[user.department];
      if (deptId) {
        const assignDeptRes = http.post(
          `${API_BASE}/users/${data.id}/department`,
          JSON.stringify({ user_id: data.id, department_id: deptId }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (assignDeptRes.status === 200) {
          console.log(`  ✓ Assigned to department: ${user.department}`);
        }
      }
      
      // Assigner à l'équipe
      const teamId = teamIds[user.team];
      if (teamId) {
        const assignTeamRes = http.post(
          `${API_BASE}/users/${data.id}/team`,
          JSON.stringify({ user_id: data.id, team_id: teamId }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (assignTeamRes.status === 200) {
          console.log(`  ✓ Assigned to team: ${user.team}`);
        }
      }
    }
  });
  
  return createdUsers;
}

function createHolidays() {
  console.log('Creating holidays...');
  
  const allHolidays = [...holidays2025FR, ...holidays2025US, ...holidays2025UK];
  
  allHolidays.forEach(holiday => {
    const payload = JSON.stringify(holiday);
    const res = http.post(`${API_BASE}/holidays`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(res, {
      'holiday created': (r) => r.status === 200,
    });
    
    if (res.status === 200) {
      console.log(`✓ Created holiday: ${holiday.name} (${holiday.country})`);
    }
  });
}

function createAbsences(userIds) {
  console.log('Creating sample absences...');
  
  const absenceTypes = ['Congés payés', 'RTT', 'Maladie', 'Congé sans solde'];
  const statuses = ['pending', 'approved', 'rejected'];
  
  // Créer quelques absences pour chaque utilisateur
  userIds.forEach(user => {
    const numAbsences = Math.floor(Math.random() * 3) + 1; // 1-3 absences par utilisateur
    
    for (let i = 0; i < numAbsences; i++) {
      const startDate = new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const duration = Math.floor(Math.random() * 10) + 1; // 1-10 jours
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);
      
      const payload = JSON.stringify({
        user_id: user.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        reason: absenceTypes[Math.floor(Math.random() * absenceTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
      });
      
      const res = http.post(`${API_BASE}/absences`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      check(res, {
        'absence created': (r) => r.status === 200,
      });
      
      if (res.status === 200) {
        console.log(`✓ Created absence for ${user.name}: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      }
    }
  });
}

export default function () {
  console.log('=== Starting Offly Data Seeding ===\n');
  
  // Vérifier que l'API est accessible
  const healthRes = http.get(`${API_BASE}/health`);
  check(healthRes, {
    'API is healthy': (r) => r.status === 200,
  });
  
  if (healthRes.status !== 200) {
    console.error('API is not accessible!');
    return;
  }
  
  console.log('✓ API is healthy\n');
  
  // Créer les données
  const deptIds = createDepartments();
  sleep(1);
  
  const teamIds = createTeams(deptIds);
  sleep(1);
  
  const userIds = createUsers(deptIds, teamIds);
  sleep(1);
  
  createHolidays();
  sleep(1);
  
  createAbsences(userIds);
  
  console.log('\n=== Data Seeding Complete ===');
  console.log(`Created:`);
  console.log(`  - ${Object.keys(deptIds).length} departments`);
  console.log(`  - ${Object.keys(teamIds).length} teams`);
  console.log(`  - ${userIds.length} users`);
  console.log(`  - ${holidays2025FR.length + holidays2025US.length + holidays2025UK.length} holidays`);
  console.log(`\nYou can now access the application at ${BASE_URL}`);
  console.log(`API documentation: ${BASE_URL}/docs`);
}
