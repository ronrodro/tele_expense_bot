import TelegramBot from 'node-telegram-bot-api';
import { Database } from './db';

enum Status {
    NONE,
    WAITING_FOR_DESCRIPTION,
    WAITING_FOR_QUANTITY,
    WAITING_FOR_VALUE,
    WAITING_FOR_WHO_PAY 
}

enum Person 
{
    AMBOS,
    RONEY_RODRIGUEZ,
    LUZ_RAMIREZ,
    TARJETA_CREDITO
}

export class ExpenseBot {
    private bot: TelegramBot;
    private db: Database;
    private userStates: { [key: number]: Status } = {};
    private userData: { [key: number]: { descripcion?: string, cantidad?: number, valor?: number, who?: number, status?: number | 1} } = {};

    constructor(token: string) 
    {
        this.bot = new TelegramBot(token, { polling: true });
        this.db = new Database();
        this.InitializeBot();
    }

    private InitializeBot() 
    {
        console.log(`Bot Iniciado...`);
        this.bot.onText(/\/gasto/, (msg) => {
            const userId = msg.chat.id;
            this.userStates[userId] = Status.WAITING_FOR_DESCRIPTION;
            this.bot.sendMessage(userId, 'Por favor, ingresa el producto:');
        });

        this.bot.onText(/\/cancelar/, (msg) => {
            const userId = msg.chat.id;
            this.userStates[userId] = Status.NONE;
            this.bot.sendMessage(userId, 'Operación cancelada.');
        });

        this.bot.on('message', (msg) => {
            const userId = msg.chat.id;
            const text = msg.text || '';

            if(this.userStates[userId] === Status.NONE) return;
            switch (this.userStates[userId]) 
            {
                case Status.WAITING_FOR_DESCRIPTION:
                    this.userData[userId] = { descripcion: text };
                    this.userStates[userId] = Status. WAITING_FOR_QUANTITY;
                    this.bot.sendMessage(userId, 'Ahora, ingresa la cantidad:');
                    break;

                case Status.WAITING_FOR_QUANTITY:
                    const cantidad = parseFloat(text);
                    if (isNaN(cantidad)) 
                        this.bot.sendMessage(userId, 'Por favor, ingresa un número válido para la cantidad.');
                    else
                    {
                        this.userData[userId].cantidad = cantidad;
                        this.userStates[userId] = Status.WAITING_FOR_VALUE;
                    }
                    this.bot.sendMessage(userId, 'Ahora, ingresa el valor por <b>unidad</b> del producto:', {parse_mode: 'HTML'});
                    break;
                case Status.WAITING_FOR_VALUE:
                    const value = parseFloat(text);
                    if (isNaN(value)) 
                        this.bot.sendMessage(userId, 'Por favor, ingresa un número válido para el valor del costo.');
                    else 
                    {
                        this.userData[userId].valor = value;
                        this.userStates[userId] = Status.WAITING_FOR_WHO_PAY;
                    }
                    this.bot.sendMessage(userId, 'Ahora, ¿Quién pago?:', {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: 'Roney Rodriguez', callback_data: 'opcion1' },
                                    { text: 'Luz Ramirez', callback_data: 'opcion2' },
                                    { text: 'Ambos', callback_data: 'opcion3' },
                                    { text: 'Tarjeta crédito', callback_data: 'opcion4' }
                                ]
                            ]
                        }
                    });
                    break;

                default:
                        // this.bot.sendMessage(userId, 'Ese comando no existen en nuestro sistema.');
                    break;
            }
        });

        this.bot.on('callback_query', (query) => {
            const chatId = query.message?.chat.id || 0;
            const data = query.data;
        
            if (data === 'opcion1') //Roney Rodriguez
            {
                this.userData[chatId].who = Person.RONEY_RODRIGUEZ;
            } 
            else if (data === 'opcion2') 
            {
                this.userData[chatId].who = Person.LUZ_RAMIREZ;
            } 
            else if (data === 'opcion3') 
            {
                this.userData[chatId].who = Person.AMBOS;
            }
            else if (data === 'opcion4') 
            {
                this.userData[chatId].who = Person.TARJETA_CREDITO;
                this.userData[chatId].status = 2;
            }

            this.SaveExpense(chatId);
            this.userStates[chatId] = Status.NONE;
        });
    }

    private FormatCO(valor: number): string 
    {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor);
    }

    private SaveExpense(userId: number) 
    {
        const data = this.userData[userId];
        console.log(data)
        if (data && data.descripcion && data.cantidad && data.valor) 
        {
            this.db.AddExpense(data.descripcion, data.cantidad, data.valor, data.who ?? 0, data.status ?? 1, (err) => {
                if (err) {
                    this.bot.sendMessage(userId, 'Hubo un error al guardar el gasto.');
                    console.error(err);
                } else {
                    this.bot.sendMessage(userId, 
                        `El gasto ha sido guardado de la siguiente manera:
Descripción: ${data.descripcion}
Cantidad solicitada: ${data.cantidad}
Valor unitario: ${this.FormatCO(data.valor ?? 0)}
Valor total: ${this.FormatCO((data.cantidad ?? 0) * (data.valor ?? 0))}`);
                }
            });
        }
        else
            this.bot.sendMessage(userId, 'Faltan información para poder agregar correctamente el gasto.');
    }
}