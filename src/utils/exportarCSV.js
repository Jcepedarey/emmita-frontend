import Papa from "papaparse";
import { saveAs } from "file-saver";

export function exportarCSV(data, nombreArchivo = "reporte") {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${nombreArchivo}.csv`);
}
