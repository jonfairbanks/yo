import { useState, useEffect } from 'react';

const AllYos = () => {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	// Fetch data from API on component mount
	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch('/api');
				const json = await response.json();
				console.log(json)
				setData(json);
				setLoading(false);
			} catch (error) {
				setError('Failed to load data');
				setLoading(false);
			}
		};

		fetchData();
	}, []); // Empty dependency array means this effect runs once on mount

	if (loading) {
		return <p>Loading...</p>;
	}

	if (error) {
		return <p>{error}</p>;
	}

	return (
		<table>
			<thead>
				<tr>
					<th>Link</th>
					<th>Site URL</th>
					<th>URL Hits</th>
					<th>Options</th>
				</tr>
			</thead>
			<tbody>
				{data.map((item, index) => (
					<tr key={index}>
						<td width="15%">
							<pre>{item.linkName}</pre>
						</td>
						<td className="site-url" width="65%">
							<a className="grey-text text-darken-2" href={"/api/redirect/" + item.linkName} target="_blank" rel="noopener noreferrer">{item.originalUrl}</a>
						</td>
						<td width="10%">
							{item.urlHits}
						</td>
						<td width="10%">
							<a href="#">
								<i className="material-icons">content_copy</i>
							</a>
							<a href="#">
								<i className="material-icons">edit</i>
							</a>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

export default AllYos;