import bcrypt from 'bcryptjs';

// Hash que tienes en la BD
const hashEnBD = '$2a$10$5VqE.rQYLl5YPZgKfM8bk.NnMqGR/vVgIx7o3oYT6PxGWGqhkKv3G';

// Verificar con diferentes contraseñas
const passwords = ['admin123', 'Admin123', 'ADMIN123', 'admin', '123456'];

console.log('\n=================================');
console.log('Verificando hash:', hashEnBD);
console.log('=================================\n');

passwords.forEach(pwd => {
    const isValid = bcrypt.compareSync(pwd, hashEnBD);
    console.log(`Contraseña: "${pwd}" -> ${isValid ? '✓ COINCIDE' : '✗ No coincide'}`);
});

console.log('\n=================================');
console.log('Generando NUEVO hash para admin123:');
const newHash = bcrypt.hashSync('admin123', 10);
console.log(newHash);
console.log('=================================\n');

