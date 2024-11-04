import { useState, useEffect } from 'react'

import AllYos from './all'
import PopularYos from './popular'
import LatestYos from './latest'

const Tabs = () => {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        try {
            const response = await fetch('/api/stats')
            if (!response.ok) throw new Error(`Error: ${response.statusText}`)
            const json = await response.json()
            setData(json)
        } catch (err) {
            setError(`Failed to load data: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div className="row primary-body">
            <div className="col s12">
                <ul className="tabs">
                    <li className="tab col s3">
                        <a className="active" href="#all">
                            All
                        </a>
                    </li>
                    <li className="tab col s3">
                        <a href="#popular">Popular</a>
                    </li>
                    <li className="tab col s3">
                        <a href="#latest">Latest</a>
                    </li>
                    <li className="tab col s3">
                        <a href="#stats">Stats</a>
                    </li>
                </ul>
            </div>
            <div id="all" className="col s12">
                <AllYos />
            </div>
            <div id="popular" className="col s12">
                <PopularYos />
            </div>
            <div id="latest" className="col s12">
                <LatestYos />
            </div>
            <div id="stats" className="col s12">
                {loading ? (
                    <p>Loading...</p>
                ) : error ? (
                    <p>{error}</p>
                ) : (
                    <pre className="grey-text">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    )
}

export default Tabs
