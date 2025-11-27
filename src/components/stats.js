import { useEffect, useState } from 'react'

const Stats = () => {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/stats')
                if (!response.ok) throw new Error(response.statusText)
                const json = await response.json()
                setData(json)
            } catch (err) {
                setError(`Failed to load data: ${err.message}`)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) return <p>Loading...</p>
    if (error) return <p>{error}</p>

    return (
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th className="right-align">Value</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Links</td>
                    <td className="right-align">
                        {data?.totalYos?.toLocaleString?.() ?? '—'}
                    </td>
                </tr>
                <tr>
                    <td>Total Redirects</td>
                    <td className="right-align">
                        {data?.totalHits?.toLocaleString?.() ?? '—'}
                    </td>
                </tr>
            </tbody>
        </table>
    )
}

export default Stats
