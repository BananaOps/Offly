import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuilding, faUserGroup, faUser } from '@fortawesome/free-solid-svg-icons'
import { User, Department, Team } from '../types'

interface Props {
  users: User[]
  departments: Department[]
  teams: Team[]
}

export default function OrganizationDiagram({ users, departments, teams }: Props) {
  // Group users by department and team
  const groupedData = departments.map(dept => {
    const deptTeams = teams.filter(t => t.departmentId === dept.id)
    return {
      department: dept,
      teams: deptTeams.map(team => ({
        team,
        users: users.filter(u => u.teamId === team.id)
      })),
      usersWithoutTeam: users.filter(u => u.departmentId === dept.id && !u.teamId)
    }
  })

  const usersWithoutDept = users.filter(u => !u.departmentId)

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-100 dark:border-gray-700 transition-colors">
      <h2 className="text-2xl font-bold text-text dark:text-white mb-6 flex items-center">
        <FontAwesomeIcon icon={faBuilding} className="text-primary mr-3" />
        Organization Chart
      </h2>

      <div className="space-y-8">
        {groupedData.map(({ department, teams, usersWithoutTeam }) => (
          <div key={department.id} className="border-l-4 border-primary pl-6">
            {/* Department */}
            <div className="mb-4">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-lg shadow-md">
                <FontAwesomeIcon icon={faBuilding} className="text-lg" />
                <span className="font-bold text-lg">{department.name}</span>
              </div>
            </div>

            {/* Teams */}
            <div className="space-y-6 ml-8">
              {teams.map(({ team, users: teamUsers }) => (
                <div key={team.id} className="border-l-4 border-secondary pl-6">
                  <div className="mb-3">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary to-accent text-white px-3 py-1.5 rounded-lg shadow-sm">
                      <FontAwesomeIcon icon={faUserGroup} className="text-sm" />
                      <span className="font-semibold">{team.name}</span>
                      <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                        {teamUsers.length} {teamUsers.length === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </div>

                  {/* Users in team */}
                  <div className="ml-8 space-y-2">
                    {teamUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-secondary transition-colors"
                      >
                        <FontAwesomeIcon icon={faUser} className="text-gray-400 dark:text-gray-500" />
                        <div className="flex-1">
                          <div className="font-medium text-text dark:text-white">{user.name}</div>
                          {user.title && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">{user.title}</div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                        {user.country && (
                          <span className="text-base" title={user.country}>
                            {getCountryFlag(user.country)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Users without team */}
              {usersWithoutTeam.length > 0 && (
                <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
                  <div className="mb-3">
                    <div className="inline-flex items-center gap-2 bg-gray-500 text-white px-3 py-1.5 rounded-lg shadow-sm">
                      <FontAwesomeIcon icon={faUserGroup} className="text-sm" />
                      <span className="font-semibold">No Team</span>
                      <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                        {usersWithoutTeam.length}
                      </span>
                    </div>
                  </div>

                  <div className="ml-8 space-y-2">
                    {usersWithoutTeam.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                      >
                        <FontAwesomeIcon icon={faUser} className="text-gray-400 dark:text-gray-500" />
                        <div className="flex-1">
                          <div className="font-medium text-text dark:text-white">{user.name}</div>
                          {user.title && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">{user.title}</div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                        {user.country && (
                          <span className="text-base" title={user.country}>
                            {getCountryFlag(user.country)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Users without department */}
        {usersWithoutDept.length > 0 && (
          <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-6">
            <div className="mb-4">
              <div className="inline-flex items-center gap-3 bg-gray-600 text-white px-4 py-2 rounded-lg shadow-md">
                <FontAwesomeIcon icon={faBuilding} className="text-lg" />
                <span className="font-bold text-lg">No Department</span>
                <span className="text-sm bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                  {usersWithoutDept.length}
                </span>
              </div>
            </div>

            <div className="ml-8 space-y-2">
              {usersWithoutDept.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-background dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  <FontAwesomeIcon icon={faUser} className="text-gray-400 dark:text-gray-500" />
                  <div className="flex-1">
                    <div className="font-medium text-text dark:text-white">{user.name}</div>
                    {user.title && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">{user.title}</div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                  {user.country && (
                    <span className="text-base" title={user.country}>
                      {getCountryFlag(user.country)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {departments.length === 0 && users.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FontAwesomeIcon icon={faBuilding} className="text-4xl mb-3 opacity-50" />
          <p>No organization data yet. Start by creating departments and teams.</p>
        </div>
      )}
    </div>
  )
}

function getCountryFlag(countryCode: string): string {
  if (!countryCode) return ''
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
