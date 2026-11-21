import {useState} from 'react';
function App() {
    const [ creatingAccount, setCreatingAccount ] = useState(false);
    const [message, setMessage] = useState('');

    function handleLogin(event) {
        event.preventDefault();
        setMessage('Form submitted. Supabase is not connected yet.')
}
reutrn (
    <main></main>);}