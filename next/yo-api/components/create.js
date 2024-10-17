const CreateModal = () => {
	return (
		<div id="create" className="modal">
			<div className="modal-content">
				<h4>Create a New Link</h4>
				<div className="s12 m6 input-field">
					<input id="link_name" type="text" placeholder="rick" maxlength="20" />
					<label for="link_name">Link Name</label>
					<span className="supporting-text">What should the new link be named?</span>
					<br/><br/>
					<div className="s12 m6 input-field">
						<input id="first_name" type="text" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
						<label for="first_name">Website URL</label>
						<span className="supporting-text">What is the original url you want to redirect to?</span>
					</div>
				</div>
			</div>
			<div className="modal-footer">
				<a href="#!" className="modal-close waves-effect btn-flat teal white-text">Create</a>
			</div>
		</div>
	);
};

export default CreateModal;