// dbms project 2.0/hash-password.js
const bcrypt = require('bcrypt');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

const saltRounds = 10; // Cost factor for bcrypt

readline.question('Enter password to hash: ', (password) => {
    if (!password) {
        console.error('Password cannot be empty.');
        readline.close();
        return;
    }
    bcrypt.hash(password, saltRounds, function(err, hash) {
        if (err) {
            console.error('Error hashing password:', err);
        } else {
            console.log('Hashed Password:', hash);
            console.log('\nNow you can use this hash to insert or update a user in your database.');
            console.log("Example SQL (replace placeholders):");
            console.log(`-- INSERT INTO Users (username, password_hash, full_name, role) VALUES ('admin', '${hash}', 'Administrator', 'admin');`);
            console.log(`-- UPDATE Users SET password_hash = '${hash}' WHERE username = 'your_username';`);
        }
        readline.close();
    });
});