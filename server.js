const express = require("express");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const { Parser } = require("json2csv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = 3001;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

app.use(express.static(path.join(__dirname, "public")));
// ...
app.get("/consulta", async (req, res) => {
    try {
        const { mes } = req.query; // "YYYY-MM"
        if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
            return res.status(400).json({ error: "Parámetro 'mes' inválido (formato YYYY-MM)" });
        }

        // Construimos solo una cadena "YYYY-MM-01" y delegamos el rango al SQL
        const inicio = `${mes}-01`;

        const [rows] = await pool.query(
            `SELECT fc.IDComprobante, fc.Sucursal, fc.Emision, fc.Tipo, fc.Letra, 
              fc.PuntoVta, fc.Numero, fc.TotalCobertura, fc.TotalComprobante, fco.IDObSoc
       FROM factcabecera fc
       JOIN factcoberturas fco ON fc.IDComprobante = fco.IDComprobante
       WHERE fco.IDObSoc = "2099"
         AND fc.Emision >= STR_TO_DATE(?, '%Y-%m-%d')
         AND fc.Emision <  DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d'), INTERVAL 1 MONTH);`,
            [inicio, inicio]
        );

        res.json(rows);
    } catch (err) {
        console.error("Error en /consulta:", err);
        res.status(500).json({ error: "Error en la consulta" });
    }
});

app.get("/consulta/csv", async (req, res) => {
    try {
        const { mes } = req.query; // "YYYY-MM"
        if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
            return res.status(400).json({ error: "Parámetro 'mes' inválido (formato YYYY-MM)" });
        }

        const inicio = `${mes}-01`;

        const [rows] = await pool.query(
            `SELECT fc.IDComprobante, fc.Sucursal, fc.Emision, fc.Tipo, fc.Letra, 
              fc.PuntoVta, fc.Numero, fc.TotalCobertura, fc.TotalComprobante, fco.IDObSoc
       FROM factcabecera fc
       JOIN factcoberturas fco ON fc.IDComprobante = fco.IDComprobante
       WHERE fco.IDObSoc = "2099"
         AND fc.Emision >= STR_TO_DATE(?, '%Y-%m-%d')
         AND fc.Emision <  DATE_ADD(STR_TO_DATE(?, '%Y-%m-%d'), INTERVAL 1 MONTH);`,
            [inicio, inicio]
        );

        if (!rows.length) return res.status(404).json({ error: "No hay datos para ese mes" });

        const { Parser } = require("json2csv");
        const parser = new Parser();
        const csv = parser.parse(rows);

        res.header("Content-Type", "text/csv");
        res.attachment(`consulta_${mes}.csv`);
        res.send(csv);
    } catch (err) {
        console.error("Error en /consulta/csv:", err);
        res.status(500).json({ error: "Error al generar CSV" });
    }
});
// ...

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
