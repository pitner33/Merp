package com.sol.merp.googlesheetloader;

import com.google.api.services.sheets.v4.model.ValueRange;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class ExcelSheetLoader {

    public ValueRange loadValuesFromXlsxTab(String xlsxPath, String tabName) throws IOException {
        try (FileInputStream fis = new FileInputStream(xlsxPath);
             Workbook workbook = new XSSFWorkbook(fis)) {
            Sheet sheet = workbook.getSheet(tabName);
            if (sheet == null) {
                throw new IOException("Tab not found in XLSX: " + tabName);
            }
            List<List<Object>> rows = new ArrayList<>();
            Iterator<Row> rowIterator = sheet.iterator();
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                List<Object> cols = new ArrayList<>();
                int lastCell = row.getLastCellNum();
                if (lastCell < 0) lastCell = 0;
                for (int c = 0; c < lastCell; c++) {
                    Cell cell = row.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    if (cell == null) {
                        cols.add("");
                        continue;
                    }
                    cols.add(getCellValue(cell));
                }
                rows.add(cols);
            }
            ValueRange vr = new ValueRange();
            vr.setValues(rows);
            return vr;
        }
    }

    private Object getCellValue(Cell cell) {
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    double d = cell.getNumericCellValue();
                    if (Math.floor(d) == d) {
                        return (long) d;
                    }
                    return d;
                }
            case BOOLEAN:
                return cell.getBooleanCellValue();
            case FORMULA:
                try {
                    FormulaEvaluator evaluator = cell.getSheet().getWorkbook().getCreationHelper().createFormulaEvaluator();
                    CellValue value = evaluator.evaluate(cell);
                    if (value == null) return "";
                    switch (value.getCellType()) {
                        case STRING:
                            return value.getStringValue();
                        case NUMERIC:
                            double d = value.getNumberValue();
                            if (Math.floor(d) == d) {
                                return (long) d;
                            }
                            return d;
                        case BOOLEAN:
                            return value.getBooleanValue();
                        default:
                            return "";
                    }
                } catch (Exception e) {
                    return "";
                }
            default:
                return "";
        }
    }
}
