import React, { useRef, useState } from 'react';
import * as XLSX from '@e965/xlsx';

const normalizeExtension = (name = '') => {
  const parts = String(name).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const FileUploader = ({
  acceptedExtensions = ['xlsx', 'xls', 'csv'],
  expectedHeaders = [],
  uploadHeaderMap = {},
  nonMandatoryFields = [],
  customValidation,
  onDataParsed,
  onError,
  onErrors,
  disabled = false,
  children,
}) => {
  const fileInputRef = useRef(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');

  const openFilePicker = () => {
    if (disabled || isParsing) return;
    fileInputRef.current?.click();
  };

  const clearSelectedFile = () => {
    setSelectedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (typeof onErrors === 'function') {
      onErrors([]);
    }
  };

  const reportErrors = (errors) => {
    const errorList = Array.isArray(errors) ? errors.filter(Boolean) : [errors].filter(Boolean);
    if (typeof onErrors === 'function') onErrors(errorList);
    if (typeof onError === 'function' && errorList[0]) onError(errorList[0]);
  };

  const processFile = async (file) => {
    if (!file) return;

    setSelectedFileName(file.name);

    if (typeof onErrors === 'function') {
      onErrors([]);
    }

    const extension = normalizeExtension(file.name);
    const allowed = acceptedExtensions.map((item) => String(item).toLowerCase());
    if (!allowed.includes(extension)) {
      reportErrors(`Please upload a valid .${allowed.join(', .')} file`);
      return;
    }

    try {
      setIsParsing(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName) {
        reportErrors('No sheet found in file');
        return;
      }

      const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: '',
        blankrows: false,
      });
      if (!sheetRows.length) {
        reportErrors('The uploaded file is empty');
        return;
      }

      const headerRow = Array.isArray(sheetRows[0]) ? sheetRows[0] : [];
      if (!headerRow.length) {
        reportErrors('The uploaded file does not contain headers');
        return;
      }

      const normalizedToOriginal = {};
      const normalizedHeaderIndex = {};
      headerRow.forEach((header, index) => {
        const original = String(header || '').trim();
        const normalized = normalizeHeader(original);
        if (!normalized) return;
        if (!normalizedHeaderIndex.hasOwnProperty(normalized)) {
          normalizedHeaderIndex[normalized] = index;
        }
        if (!normalizedToOriginal[normalized]) normalizedToOriginal[normalized] = [];
        normalizedToOriginal[normalized].push(original);
      });

      const duplicateHeaders = Object.values(normalizedToOriginal)
        .filter((matches) => matches.length > 1)
        .map((matches) => matches.join("', '"));
      if (duplicateHeaders.length) {
        reportErrors([`Duplicate headers found: ${duplicateHeaders.map((item) => `'${item}'`).join(', ')}`]);
        return;
      }

      const headerLookup = {};
      expectedHeaders.forEach((headerKey) => {
        const uploadKey = uploadHeaderMap[headerKey] || headerKey;
        headerLookup[headerKey] = normalizedHeaderIndex[normalizeHeader(uploadKey)];
      });

      const missingHeaders = expectedHeaders.filter((headerKey) => {
        const isOptional = nonMandatoryFields.includes(headerKey);
        return !isOptional && headerLookup[headerKey] === undefined;
      });

      if (missingHeaders.length) {
        reportErrors([
          `Invalid file format. Missing required columns: ${missingHeaders
            .map((header) => uploadHeaderMap[header] || header)
            .join(', ')}`,
        ]);
        return;
      }

      const bodyRows = sheetRows.slice(1).filter((row) =>
        Array.isArray(row) ? row.some((cell) => String(cell || '').trim() !== '') : false,
      );
      if (!bodyRows.length) {
        reportErrors('No data rows found in file');
        return;
      }

      const parsedRows = bodyRows.map((row) => {
        const mappedRow = {};
        expectedHeaders.forEach((headerKey) => {
          const index = headerLookup[headerKey];
          mappedRow[headerKey] = index === undefined ? '' : String(row[index] ?? '').trim();
        });
        return mappedRow;
      });

      const validationErrors = [];
      parsedRows.forEach((row, rowIndex) => {
        expectedHeaders.forEach((headerKey) => {
          if (nonMandatoryFields.includes(headerKey)) return;
          if (!String(row[headerKey] ?? '').trim()) {
            validationErrors.push(`Row ${rowIndex + 2}: ${uploadHeaderMap[headerKey] || headerKey} is required`);
          }
        });
        if (typeof customValidation === 'function') {
          const rowValidationResult = customValidation(row, rowIndex);
          if (typeof rowValidationResult === 'string' && rowValidationResult.trim()) {
            validationErrors.push(rowValidationResult);
          }
          if (Array.isArray(rowValidationResult) && rowValidationResult.length) {
            validationErrors.push(...rowValidationResult.filter(Boolean));
          }
        }
      });

      if (validationErrors.length) {
        reportErrors(validationErrors);
        return;
      }

      if (typeof onErrors === 'function') {
        onErrors([]);
      }

      if (typeof onDataParsed === 'function') {
        await onDataParsed(parsedRows, file);
      }
    } catch (_error) {
      reportErrors('Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await processFile(file);
  };

  const handleDropZoneClick = () => {
    openFilePicker();
  };

  const handleDropZoneKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (disabled || isParsing) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || isParsing) return;
    const file = event.dataTransfer?.files?.[0];
    await processFile(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions.map((ext) => `.${ext}`).join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
      {typeof children === 'function'
        ? children({
            openFilePicker,
            clearSelectedFile,
            fileName: selectedFileName,
            isParsing,
            isDragging,
            getDropZoneProps: () => ({
              role: 'button',
              tabIndex: disabled || isParsing ? -1 : 0,
              onClick: handleDropZoneClick,
              onKeyDown: handleDropZoneKeyDown,
              onDragOver: handleDragOver,
              onDragLeave: handleDragLeave,
              onDrop: handleDrop,
            }),
          })
        : null}
    </>
  );
};

export default FileUploader;
