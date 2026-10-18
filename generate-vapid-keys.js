const webPush = require('web-push');

const keys = webPush.generateVAPIDKeys();

console.log('=== СГЕНЕРИРОВАНЫ VAPID КЛЮЧИ ДЛЯ WEB PUSH ===\n');
console.log('Скопируйте эти переменные окружения в настройки Vercel (Project Settings -> Environment Variables):\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:admin@baza.ru\n');
console.log('==============================================');
