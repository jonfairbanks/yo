import React, { useState } from 'react';

const createNewYo = async (event) => {
	event.preventDefault(); // Prevent page reload

	const form = event.target;
	const linkName = form.linkName.value;
	const originalUrl = form.originalUrl.value;

	const data = {
    linkName: linkName,
    originalUrl: originalUrl,
  };

  try {
    const response = await fetch('/api/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {

		} else {
      throw new Error('Network response was not ok:', response);
    }

    const result = await response.json();
    console.log('Success:', result);
    form.reset(); // Reset form after successful submission
  } catch (error) {
    console.error('Error submitting form:', error);
  }
};

const CreateModal = () => {
	return (
		<form className="row" onSubmit={createNewYo}>
			<div id="create" className="modal">
				<div className="modal-content">
					<h4>Create a New Link</h4>
					<div className="s12 m6 input-field">
						<input id="linkName" type="text" placeholder="rick" maxLength="120" />
						<label htmlFor="linkName">Link Name</label>
						<span className="supporting-text">What should the new link be named?</span>
						<br /><br />
						<div className="s12 m6 input-field">
							<input id="originalUrl" type="text" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
							<label htmlFor="originalUrl">Website URL</label>
							<span className="supporting-text">What is the original url you want to redirect users to?</span>
						</div>
					</div>
				</div>
				<div className="modal-footer">
					<button type="submit" className="modal-close waves-effect btn-flat teal white-text">
						Create
					</button>
				</div>
			</div>
		</form>
	);
};

export default CreateModal;