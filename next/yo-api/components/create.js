import React, { useState } from 'react';

const CreateModal = () => {
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false); // Track success state
	const [newLink, setNewLink] = useState(''); // Track newly created link

	const CreateNewYo = async (event) => {
		event.preventDefault(); // Prevent page reload

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
			const response = await fetch('/api/create', {
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

	return (
		<form className="row" onSubmit={CreateNewYo}>
			<div id="create" className="modal">
				<div className="modal-content">
					{success ? (
						<div>
							<p>Success! Your new link has been created.</p>
							<a href={`/api/redirect/${newLink}`} className="btn grey" target="_blank" rel="noopener noreferrer">
								<i className="material-icons">redo</i> Go to Link
							</a>
							<a href="#" className="btn teal white-text text-darken-4">
								<i className="material-icons">content_copy</i> Copy Link
							</a>
						</div>
					) : (
						<div>
							<h4>Create a New Link</h4>
							<div className="s12 m6 input-field">
								<input id="linkName" type="text" placeholder="rick" maxLength="120" required />
								<label htmlFor="linkName">Link Name</label>
								<span className="supporting-text">What should the new link be named?</span>
							</div>
							<br /><br />
							<div className="s12 m6 input-field">
								<input id="originalUrl" type="url" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" required />
								<label htmlFor="originalUrl">Website URL</label>
								<span className="supporting-text">What is the original URL you want to redirect users to?</span>
							</div>
							<br/>
						</div>
					)}

					{/* Show error message if there is an error */}
					{error && <p className="red-text text-darken-1">{error}</p>}
				</div>

				<div className="modal-footer">
					{!success && (
						<button type="submit" className="waves-effect btn-flat teal white-text">
							Create
						</button>
					)}
				</div>
			</div>
		</form>
	);
};

export default CreateModal;