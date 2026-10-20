import { useState, useEffect } from "react";
import Toast from "../components/Toast";
import Spinner from "../components/Spinner";
import { getContacts, createContact, updateContact, deleteContact } from "../api";

function Contact() {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Toast state
    const [toastMsg, setToastMsg] = useState("");
    const [toastType, setToastType] = useState("success");

    const showToast = (msg, type = "success") => {
        setToastMsg(msg);
        setToastType(type);
        setTimeout(() => setToastMsg(""), 3500);
    };

    const fetchMessages = async () => {
        try {
            const data = await getContacts();
            setMessages(data || []);
        } catch (err) {
            showToast(err.message || "Failed to load messages", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                const updated = await updateContact(editingId, { name, message });
                setMessages(messages.map(m => m._id === editingId ? updated : m));
                setEditingId(null);
                showToast("Message updated successfully!");
            } else {
                const created = await createContact({ name, message });
                setMessages([created, ...messages]);
                showToast("Message sent successfully!");
            }
            setName("");
            setMessage("");
        } catch (err) {
            showToast(err.message || "Operation failed", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (msg) => {
        setName(msg.name);
        setMessage(msg.message);
        setEditingId(msg._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setName("");
        setMessage("");
        setEditingId(null);
    };

    const handleDelete = async (id, msgName) => {
        if (window.confirm(`Delete the message from "${msgName}"?`)) {
            try {
                await deleteContact(id);
                setMessages(messages.filter(m => m._id !== id));
                if (editingId === id) handleCancelEdit();
                showToast("Message deleted successfully!");
            } catch (err) {
                showToast(err.message || "Delete failed", "error");
            }
        }
    };

    return (
        <div className="container" style={{ maxWidth: "850px" }}>
            <h1 className="page-title">Contact Me</h1>

            <div className="card" style={{ marginBottom: "40px" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, borderBottom: 'none' }}>
                        {editingId ? "✏️ Edit Message" : "✉️ Send a Message"}
                    </h2>
                    {editingId && (
                        <button 
                            type="button" 
                            onClick={handleCancelEdit} 
                            style={{ padding: '6px 14px', border: '1px solid #ccc', background: '#f3f4f6', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <p style={{ color: "#6b7280", marginTop: 0, marginBottom: "20px" }}>
                    Leave a message below. Messages are saved in MongoDB and can be managed directly.
                </p>
                
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#374151" }}>Your Name *</label>
                        <input 
                            type="text" 
                            placeholder="John Doe"
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "15px" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#374151" }}>Your Message *</label>
                        <textarea 
                            rows="4" 
                            placeholder="Write your message here..."
                            value={message} 
                            onChange={(e) => setMessage(e.target.value)} 
                            required 
                            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #d1d5db", fontSize: "15px", resize: "vertical" }}
                        />
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                        <button 
                            type="submit" 
                            disabled={submitting}
                            style={{ 
                                padding: "12px 28px", 
                                backgroundColor: "#2563eb", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "30px", 
                                cursor: submitting ? "not-allowed" : "pointer", 
                                fontWeight: "600",
                                fontSize: "15px",
                                opacity: submitting ? 0.7 : 1
                            }}
                        >
                            {submitting ? "Submitting..." : (editingId ? "Update Message" : "Send Message")}
                        </button>
                        {editingId && (
                            <button 
                                type="button" 
                                onClick={handleCancelEdit} 
                                style={{ padding: "12px 20px", backgroundColor: "#e5e7eb", color: "#374151", border: "none", borderRadius: "30px", cursor: "pointer", fontWeight: "600" }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #f3f4f6", paddingBottom: "15px" }}>
                    <h2 style={{ margin: 0, borderBottom: 'none' }}>
                        Messages ({messages.length})
                    </h2>
                    <button 
                        onClick={fetchMessages} 
                        style={{ padding: "8px 16px", cursor: "pointer", backgroundColor: "#eef4ff", color: "#2563eb", border: "none", borderRadius: "8px", fontWeight: "600" }}
                    >
                        🔄 Refresh
                    </button>
                </div>
                
                {loading ? (
                    <Spinner message="Loading Messages..." />
                ) : messages.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                        No messages yet. Be the first to leave a message!
                    </p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {messages.map((msg) => (
                            <div key={msg._id} style={{ padding: "20px", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "12px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                                    <h4 style={{ margin: 0, color: "#111827", fontSize: "16px", fontWeight: "700" }}>{msg.name}</h4>
                                    <small style={{ color: "#9ca3af" }}>
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                                    </small>
                                </div>
                                <p style={{ margin: "0 0 15px 0", color: "#4b5563", whiteSpace: "pre-wrap" }}>{msg.message}</p>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button 
                                        onClick={() => handleEdit(msg)} 
                                        style={{ padding: "6px 14px", backgroundColor: "white", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#2563eb" }}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(msg._id, msg.name)} 
                                        style={{ padding: "6px 14px", backgroundColor: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Toast message={toastMsg} type={toastType} />
        </div>
    );
}

export default Contact;