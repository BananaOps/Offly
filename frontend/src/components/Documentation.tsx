import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faUsers, faSitemap, faCalendarAlt, faServer, faCode } from '@fortawesome/free-solid-svg-icons'

export default function Documentation() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          Documentation
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Learn how to use Offly - Time Off Manager
        </p>
      </div>

      {/* Overview */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Overview
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Offly is a modern time off and absence management system designed to help organizations track employee absences, 
          manage teams, and maintain an organized calendar of holidays and time off requests.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <FontAwesomeIcon icon={faServer} className="text-primary text-2xl mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Backend</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Go with gRPC, Protocol Buffers, and REST Gateway
            </p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <FontAwesomeIcon icon={faCode} className="text-secondary text-2xl mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Frontend</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              React + TypeScript + Tailwind CSS
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Features
        </h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faCalendarDays} className="text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Time Off Management</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                View and manage employee absences in a calendar grid format. Create, edit, and delete time off requests 
                with different types (vacation, sick leave, remote work, etc.).
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faUsers} className="text-secondary mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">User Management</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Create and manage users with their roles, departments, and teams. Assign users to specific organizational units.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faSitemap} className="text-accent mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Organization Structure</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Define departments and teams to organize your workforce. Manage hierarchical structures and team compositions.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Holiday Management</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Configure public holidays and company-wide closures. Holidays are automatically displayed in the calendar view.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Getting Started
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">1. Set Up Organization</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Start by creating departments and teams in the <span className="font-medium">Organization</span> tab. 
              This will help you organize your workforce effectively.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">2. Add Users</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Navigate to the <span className="font-medium">Users</span> tab to create user accounts. 
              Assign them to departments and teams as needed.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">3. Configure Holidays</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Go to the <span className="font-medium">Holidays</span> tab to set up public holidays and company closures. 
              These will appear automatically in the calendar.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">4. Manage Time Off</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Use the <span className="font-medium">Time Off</span> tab to view and manage absences. 
              Click on any cell to create a new absence request.
            </p>
          </div>
        </div>
      </section>

      {/* API Information */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-colors">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          API Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Offly provides both REST and gRPC APIs for integration with other systems.
        </p>
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              <span className="font-semibold">REST API:</span> http://localhost:8080/api/v1
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              <span className="font-semibold">gRPC:</span> localhost:50051
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          For detailed API documentation, please refer to the Protocol Buffer definitions in the backend repository.
        </p>
      </section>

      {/* Tips */}
      <section className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
          Tips & Best Practices
        </h2>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Use filters to quickly find specific users or teams in the calendar view</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Set up holidays at the beginning of the year to avoid scheduling conflicts</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Organize users into departments and teams for better visibility</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Use the dark mode toggle for comfortable viewing in different lighting conditions</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Click on any absence to view details or make modifications</span>
          </li>
        </ul>
      </section>
    </div>
  )
}

