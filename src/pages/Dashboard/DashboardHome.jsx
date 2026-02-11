import React from 'react'

const DashboardHome = () => {
  return (
     <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      {/* <Sidebar active="Dashboard" /> */}

      {/* Main content */}
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        {/* Example cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-medium mb-2">Total Employees</h2>
            <p className="text-2xl font-bold">10</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-medium mb-2">Present</h2>
            <p className="text-2xl font-bold">10</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-medium mb-2">On Leave</h2>
            <p className="text-2xl font-bold">2</p>
          </div>
        </div>

        {/* Example table */}
        <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-medium mb-4">Trips</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2">Driver Name</th>
                <th className="py-2">Date</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2">Fluffy</td>
                <td className="py-2">2026-02-11</td>
                <td className="py-2 text-green-600 font-semibold">First Load</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">Buddy</td>
                <td className="py-2">2026-02-10</td>
                <td className="py-2 text-yellow-600 font-semibold">Second Load</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">Mittens</td>
                <td className="py-2">2026-02-09</td>
                <td className="py-2 text-red-600 font-semibold">Cancelled</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-medium mb-4">Cash Advances</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2">Driver Name</th>
                <th className="py-2">Date</th>
                <th className="py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2">Fluffy</td>
                <td className="py-2">2026-02-11</td>
                <td className="py-2 text-green-600 font-semibold">2000</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">Buddy</td>
                <td className="py-2">2026-02-10</td>
                <td className="py-2 text-yellow-600 font-semibold">1500</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2">Mittens</td>
                <td className="py-2">2026-02-09</td>
                <td className="py-2 text-red-600 font-semibold">1000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default DashboardHome