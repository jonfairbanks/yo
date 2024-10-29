import { useState, useEffect } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const AllYos = () => {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [clickedCopy, setClickedCopy] = useState(null); // Align names
	const [newLink, setNewLink] = useState(''); // Required?
	const [selectedRow, setSelectedRow] = useState(''); // Align names
	const [success, setSuccess] = useState(false); // Edit Success

	// Fetch data from API on component mount
	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await fetch('/api');
				const json = await response.json();
				setData(json);
				setLoading(false);
			} catch (error) {
				setError('Failed to load data');
				setLoading(false);
			}
		};

		fetchData();

		if (selectedRow) {
			console.log("Selected row updated:", selectedRow);
			// Any other logic that depends on the updated selectedRow can go here
			if (typeof window !== 'undefined') {
				const M = require('@materializecss/materialize'); // eslint-disable-line @typescript-eslint/no-require-imports
				M.AutoInit();
				const elem = document.getElementById('update');
				const instance = M.Modal.init(elem, {dismissible: true});
				instance.open();
			}
		}
	}, [selectedRow]);

	const handleCopyClick = (linkName) => {
		setClickedCopy(linkName); // Set the clicked copy to the specific linkName
		setTimeout(() => setClickedCopy(null), 2500); // Reset `clickedCopy` after N seconds
	};

	const UpdateYo = async (event) => {
		event.preventDefault(); // Prevent page reload

		console.log("***", item)

		const form = event.target;
		const linkName = form.linkName.value;
		const originalUrl = form.originalUrl.value;

		const data = {
			linkName: linkName,
			originalUrl: originalUrl,
		};

		// Reset states before the new request
		setSuccess(false);
		setError(null);

		try {
			const response = await fetch('/api/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Unknown error occurred');
			}

			const result = await response.json();
			console.log('Success:', result);

			// Reset form after successful submission
			form.reset();
			setNewLink(result.linkName); // Store the new link
			setSuccess(true); // Show success message
		} catch (error) {
			setError(error.message);
			console.error('Error submitting form:', error);
		}
	};

	if (loading) {
		return <p>Loading...</p>;
	}

	if (error) {
		return <p>{error}</p>;
	}

	return (
		<div>
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
								<CopyToClipboard text={window.location.host + "/" + item.linkName}>
									<pre style={{ cursor: 'pointer' }}>{item.linkName}</pre>
								</CopyToClipboard>
							</td>
							<td className="site-url" width="55%">
								<a
									className="grey-text text-darken-1"
									href={"/api/redirect/" + item.linkName}
									target="_blank"
									rel="noopener noreferrer"
								>
									{item.originalUrl}
								</a>
							</td>
							<td width="10%">
								<p className="grey-text text-darken-1">{item.urlHits}</p>
							</td>
							<td width="20%">
								{clickedCopy === item.linkName ? (
									<a
										className="btn-small icon-left teal white-text text-darken-2"
										style={{ marginRight: "5px" }}
									>
										<i className="material-icons">done</i>Copy
									</a>
								) : (
									<CopyToClipboard
										text={window.location.host + "/" + item.linkName}
										onCopy={() => handleCopyClick(item.linkName)}
									>
										<a
											className="btn-small icon-left teal darken-2 white-text text-darken-2"
											style={{ marginRight: "5px" }}
										>
											<i className="material-icons">content_copy</i>Copy
										</a>
									</CopyToClipboard>
								)}
								<a href="#update" onClick={() => setSelectedRow(item)} className="modal-trigger btn-small icon-left grey grey-text text-darken-2">
									<i className="material-icons">edit</i>Edit
								</a>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<form className="row" onSubmit={UpdateYo}>
				<div id="update" className="modal">
					<div className="modal-content">
						{success ? (
							<div>
								<p>Success! Your link has been updated.</p>
								<a href={`/api/redirect/${newLink}`} className="btn grey" target="_blank" rel="noopener noreferrer">
									<i className="material-icons">redo</i> Go to Link
								</a>
								<a href="#" className="btn teal white-text text-darken-4">
									<i className="material-icons">content_copy</i> Copy Link
								</a>
							</div>
						) : (
							<div>
								<h4>Update Link</h4>
								<div className="s12 m6 input-field">
									<input id="linkName" value={selectedRow.linkName} type="text" placeholder="rick" maxLength="120" disabled />
									<label htmlFor="linkName">Link Name</label>
									<span className="supporting-text">What should the new link be named?</span>
								</div>
								<br /><br />
								<div className="s12 m6 input-field">
									<input id="originalUrl" type="url" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" value={selectedRow.originalUrl} required />
									<label htmlFor="originalUrl">Website URL</label>
									<span className="supporting-text">What is the original URL you want to redirect users to?</span>
								</div>
								<br />
							</div>
						)}

						{/* Show error message if there is an error */}
						{error && <p className="red-text text-darken-1">{error}</p>}
					</div>

					<div className="modal-footer">
						{!success && (
							<div>
								<button type="button" className="delete-modal-btn waves-effect btn-flat red white-text">
									Delete
								</button>
								<button type="submit" className="update-modal-btn waves-effect btn-flat teal white-text">
									Update
								</button>
							</div>
						)}
					</div>
				</div>
			</form>
		</div>
	);
};

export default AllYos;