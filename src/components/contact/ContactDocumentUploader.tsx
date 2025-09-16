import { invoke } from '@tauri-apps/api/core';
import { AlertCircle, FileText, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { Contact, ContactDocument, DocumentFormat } from '../../types';

interface ContactDocumentUploaderProps {
  onUploadSuccess: (document: ContactDocument, contacts: Contact[]) => void;
}

export const ContactDocumentUploader: React.FC<ContactDocumentUploaderProps> = ({
  onUploadSuccess
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats: DocumentFormat[] = ['txt', 'csv', 'excel', 'vcf', 'json'];

  const formatDescriptions = {
    txt: '纯文本文件，每行一个联系人',
    csv: 'CSV格式，包含姓名、电话等字段',
    excel: 'Excel文件，支持.xlsx和.xls',
    vcf: 'vCard联系人文件',
    json: 'JSON格式的联系人数据'
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const getFileFormat = (filename: string): DocumentFormat => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
        return 'txt';
      case 'csv':
        return 'csv';
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'vcf':
        return 'vcf';
      case 'json':
        return 'json';
      default:
        return 'txt';
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // 读取文件内容
      const text = await file.text();

      // 调用 Rust 后端解析联系人
      const result = await invoke('parse_contact_file', {
        fileName: file.name,
        content: text
      });

      if (result && typeof result === 'object') {
        const parsed = result as {
          success: boolean;
          document?: {
            id: string;
            filename: string;
            filepath: string;
            upload_time: string;
            total_contacts: number;
            processed_contacts: number;
            status: string;
            format: string;
            contacts: Array<{
              id: string;
              name: string;
              phone?: string;
              email?: string;
              notes?: string;
            }>;
          };
          error?: string;
        };

        if (parsed.success && parsed.document) {
          // 创建文档记录
          const document: ContactDocument = {
            id: parsed.document.id,
            filename: parsed.document.filename,
            filepath: parsed.document.filepath,
            uploadTime: new Date(parsed.document.upload_time),
            totalContacts: parsed.document.total_contacts,
            processedContacts: parsed.document.processed_contacts,
            status: 'completed',
            format: getFileFormat(file.name)
          };

          // 转换联系人数据
          const contacts: Contact[] = parsed.document.contacts.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            notes: c.notes
          }));

          onUploadSuccess(document, contacts);
        } else {
          throw new Error(parsed.error || '解析失败');
        }
      } else {
        throw new Error('解析结果格式错误');
      }

    } catch (error) {
      console.error('文件上传失败:', error);
      setUploadError(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900">
            拖拽文件到此处，或
            <button
              onClick={handleBrowseClick}
              disabled={isUploading}
              className="text-indigo-600 hover:text-indigo-500 ml-1"
            >
              点击浏览
            </button>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            支持 TXT, CSV, Excel, VCF, JSON 格式
          </p>
        </div>

        {isUploading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">正在上传和解析文件...</p>
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* 支持的格式说明 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supportedFormats.map((format) => (
          <div key={format} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-gray-400 mr-2" />
              <span className="font-medium text-gray-900 uppercase">{format}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {formatDescriptions[format]}
            </p>
          </div>
        ))}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".txt,.csv,.xlsx,.xls,.vcf,.json"
        className="hidden"
      />
    </div>
  );
};

