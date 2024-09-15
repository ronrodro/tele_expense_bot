import sqlite3 from 'sqlite3';

export class Database {
    private db: sqlite3.Database;

    constructor() 
    {
        this.db = new sqlite3.Database('./expenses.db');
        this.init();
    }

    private init() {
        this.db.run(`CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            descripcion TEXT,
            cantidad REAL,
            valor REAL,
            quien INTEGER,
            estado INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
    }

    AddExpense(description: string, amount: number, value: number, who: number, status: number, callback: (err: Error | null) => void) 
    {
        if(isNaN(status))
            status = 1;
        this.db.run(`INSERT INTO expenses (descripcion, cantidad, valor, quien, estado) VALUES (?, ?, ?, ?, ?)`, [description, amount, value, who,status], callback);
    }
}