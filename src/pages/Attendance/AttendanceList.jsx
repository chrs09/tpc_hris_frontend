import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { addMonths, subMonths, format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from 'date-fns'
import { getEmployeeList } from './../../api/employee/index';

//static data for testing purposes
const attendanceData = [
  { name: 'Snowss', date: '2026-02-11', status: 'Present', type: 'ADMIN' },
  { name: 'Fluffy', date: '2026-02-11', status: 'Present', type: 'YARD' },
  { name: 'Buddy', date: '2026-02-10', status: 'On Leave', type: 'LABOR' },
  { name: 'Mittens', date: '2026-02-09', status: 'Absent', type: 'CPDC DRIVER' },
  { name: 'Mittenskwe', date: '2026-02-09', status: 'Absent', type: 'CPDC DRIVER' },
  { name: 'Mittens', date: '2026-02-09', status: 'Absent', type: 'CPDC DRIVER' },
  { name: 'Mittenskwe', date: '2026-02-07', status: 'Present', type: 'CPDC DRIVER' },
  { name: 'Mittenssssss', date: '2026-02-09', status: 'Absent', type: 'CPDC DRIVER' },
  { name: 'Snow', date: '2026-02-25', status: 'Absent', type: 'CPDC DRIVER' },
]

const AttendanceList = () => {
  const [employeesFromAPI, setEmployeesFromAPI] = useState([]);
  const [quincena, setQuincena] = useState('all')
  const [filter, setFilter] = useState('All')
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-02-01'))

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

    // Fetch employee list on component mount  
    useEffect(()=> {
        const getEmployees = async () => {
          const emp_data = await getEmployeeList();
          setEmployeesFromAPI(emp_data);
        }
        getEmployees();
    }, []);

    // Extract employee names for easier access in attendance grid
    const employeeNamesFromAPI = employeesFromAPI.map(emp => `${emp.first_name} ${emp.last_name}`);

    const allDaysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
    })

    //filter mothly days based on quincena selection
    const daysInMonth = allDaysInMonth.filter(day => {
    const dayNumber = day.getDate()

    if (quincena === 'first') {
        return dayNumber >= 1 && dayNumber <= 15
    }

    if (quincena === 'second') {
        return dayNumber >= 16
    }

    return true
    })

// FILTERING OF ATTENDANCE DATA BASED ON MONTH, ROLE, AND QUINCENA
    const filteredAttendance = attendanceData.filter(item => {
    const recordDate = new Date(item.date)

    const sameMonth =
        recordDate.getMonth() === currentMonth.getMonth() &&
        recordDate.getFullYear() === currentMonth.getFullYear()

    const matchesRole = filter === 'All' || item.type === filter

    let matchesQuincena = true
    const day = recordDate.getDate()

    if (quincena === 'first') {
        matchesQuincena = day >= 1 && day <= 15
    } else if (quincena === 'second') {
        matchesQuincena = day >= 16
    }

    return sameMonth && matchesRole && matchesQuincena
    })

    // const employees = Array.from(new Set(filteredAttendance.map(emp => emp.name)))
    const employees = employeesFromAPI.map(emp => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      role: emp.position
    }));

  const getStatus = (employee, date) => {
    const record = attendanceData.find(
      item => item.name === employee && item.date === format(date, 'yyyy-MM-dd')
    )
    if (!record) return ''
    if (record.status === 'Present') return '✅'
    if (record.status === 'On Leave') return '🟡'
    if (record.status === 'Absent') return '❌'
    return record.status
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar active="Attendance" />

      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Attendance</h1>

        {/* Filter & Month Navigation */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 space-y-2 md:space-y-0">
          <div>
            <label className="mr-2 font-medium">Filter by Role:</label>
            <select
              className="border border-gray-300 rounded px-3 py-2"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="ADMIN">ADMIN</option>
              <option value="YARD">YARD</option>
              <option value="MOTORPOL">MOTORPOL</option>
              <option value="DUMPTRACK">DUMPTRACK</option>
              <option value="LABOR">LABOR</option>
              <option value="CDC DRIVER">CDC DRIVER</option>
              <option value="CDC HELPER">CDC HELPER</option>
              <option value="CPDC DRIVER">CPDC DRIVER</option>
              <option value="CPDC HELPER">CPDC HELPER</option>
            </select>
          </div>
          <div>
            <label className="mr-2 font-medium">Filter by Quincena:</label>
            <select
            value={quincena}
            onChange={(e) => setQuincena(e.target.value)}
            className="border px-3 py-2 rounded-md"
            >
                <option value="all">All Dates</option>
                <option value="first">First Quincena (1–15)</option>
                <option value="second">Second Quincena (16–end)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              className="px-3 md:px-4 py-1 md:py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm md:text-base"
              onClick={handlePrevMonth}
            >
              Prev
            </button>
            <span className="font-semibold text-sm md:text-base">{format(currentMonth, 'MMMM yyyy')}</span>
            <button
              className="px-3 md:px-4 py-1 md:py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm md:text-base"
              onClick={handleNextMonth}
            >
              Next
            </button>
          </div>
        </div>

        {/* Attendance Grid */}
        <div className="bg-white h-[70vh] p-2 md:p-4 rounded-xl shadow-md border border-gray-300 overflow-x-auto">
          <table className="min-w-[700px] md:min-w-full border border-gray-300 border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-2 px-2 md:px-4 sticky left-0 bg-white z-10 border-r border-gray-300 w-32 md:w-40">
                  Employee
                </th>
                {daysInMonth.map(day => (
                  <th
                    key={day}
                    className={`py-1 md:py-2 px-1 md:px-2 text-center border-r border-gray-300 w-8 md:w-12 ${
                      getDay(day) === 0 ? 'bg-yellow-200' : ''
                    }`}
                  >
                    {format(day, 'dd')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-gray-300">
                  <td className="py-1 md:py-2 px-2 md:px-4 font-medium sticky left-0 bg-white z-10 border-r border-gray-300 w-32 md:w-40">
                    {emp.name}
                  </td>
                  {daysInMonth.map(day => (
                    <td
                      key={day}
                      className={`py-1 md:py-2 px-1 md:px-2 text-center border-r border-gray-300 w-8 md:w-12 ${
                        getDay(day) === 0 ? 'bg-yellow-100' : ''
                      }`}
                    >
                      {getStatus(emp, day)}
                    </td>
                  ))}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth.length + 1} className="py-4 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              )}
              {/* {employees.map(emp => (
                <tr key={emp} className="border-b border-gray-300">
                  <td className="py-1 md:py-2 px-2 md:px-4 font-medium sticky left-0 bg-white z-10 border-r border-gray-300 w-32 md:w-40">
                    {emp}
                  </td>
                  {daysInMonth.map(day => (
                    <td
                      key={day}
                      className={`py-1 md:py-2 px-1 md:px-2 text-center border-r border-gray-300 w-8 md:w-12 ${
                        getDay(day) === 0 ? 'bg-yellow-100' : ''
                      }`}
                    >
                      {getStatus(emp, day)}
                    </td>
                  ))}
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth.length + 1} className="py-4 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              )} */}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}

export default AttendanceList