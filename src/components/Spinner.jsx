function Spinner({ message = "Loading..." }) {
    return (
        <div className="spinner-container">
            <div className="spinner"></div>
            <h2>{message}</h2>
        </div>
    );
}

export default Spinner;