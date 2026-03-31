import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StudentFilters from '@/components/students/StudentFilters'
import { GRADES } from '@/lib/utils'
import type { Profile, Student } from '@/types/database'

interface SearchParams {
  grade?: string
  q?: string
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  const params = await searchParams

  let query = supabase
    .from('students')
    .select('*')
    .order('full_name')

  // GLCs only see their grade
  if (profile?.role === 'glc' && profile.grade) {
    query = query.eq('grade', profile.grade)
  } else if (params.grade) {
    query = query.eq('grade', params.grade)
  }

  if (params.q) {
    query = query.or(`full_name.ilike.%${params.q}%,student_id.ilike.%${params.q}%`)
  }

  const { data: students } = await query.returns<Student[]>()

  const canChooseGrade = profile?.role !== 'glc'

  // Group by grade for display
  const byGrade: Record<string, Student[]> = {}
  for (const s of students ?? []) {
    if (!byGrade[s.grade]) byGrade[s.grade] = []
    byGrade[s.grade].push(s)
  }

  const orderedGrades = GRADES.filter((g) => byGrade[g])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">Students</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {students?.length ?? 0} student{students?.length !== 1 ? 's' : ''}
          {profile?.role === 'glc' && profile.grade ? ` · ${profile.grade}` : ''}
        </p>
      </div>

      <StudentFilters
        canChooseGrade={canChooseGrade}
        currentParams={params}
      />

      {orderedGrades.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No students match your search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedGrades.map((grade) => (
            <div key={grade}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                {grade} · {byGrade[grade].length} student{byGrade[grade].length !== 1 ? 's' : ''}
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Year group</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Student ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byGrade[grade].map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/students/${student.id}`}
                            className="font-medium text-gray-900 hover:text-[#1B3A6B] transition-colors"
                          >
                            {student.full_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{student.year_group}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{student.student_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
