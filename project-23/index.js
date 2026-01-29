```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({ authStrategy: new LocalAuth() });

const adminIds = ['123456789@c.us']; // Coloque os números dos administradores aqui

client.on('qr', (qr) => {
    console.log('QR recebido, escaneie com o WhatsApp.');
});

client.on('ready', () => {
    console.log('Bot está pronto!');
});

client.on('message', async message => {
    if (message.body.startsWith('!')) {
        const [command, ...args] = message.body.slice(1).trim().split(/ +/);
        
        if (command === 'ban') {
            if (!adminIds.includes(message.from)) {
                return message.reply('Você não tem permissão para usar esse comando.');
            }

            const userToBan = args[0];
            if (!userToBan) {
                return message.reply('Por favor, especifique o usuário a ser banido.');
            }

            // Aqui você pode adicionar lógica para banir o usuário, por exemplo, guardar em uma lista
            // Para o exemplo, vamos apenas responder que o usuário foi banido
            return message.reply(`Usuário ${userToBan} foi banido com sucesso!`);
        }
    }
});

client.initialize();
```