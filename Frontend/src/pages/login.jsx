import React, { useState } from "react";
export default function LoginPage() {
    const [message, setMessage] = useState('');

    function handleLogin(event) {
        event.preventDefault();
        setMessage('Form submitted. Supabase is not connected yet.')
}
    return (
        <main>
            <form onSubmit={handleLogin}>
                <button type="submit">Log in</button>
            </form>

            <p>{message}</p>
        </main>
    );
}