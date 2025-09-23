import { Injectable, signal } from '@angular/core';

export interface Translation {
  [key: string]: string;
}

export interface Translations {
  en: Translation;
  ar: Translation;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguage = signal<'en' | 'ar'>('en');

  private translations: Translations = {
    en: {
      // Navigation
      'nav.generateCalendar': 'Generate Calendar',
      'nav.endpoints': 'End Points',
      'nav.logs': 'Logs',
      'nav.backend': 'Backend',
      'nav.online': 'ONLINE',
      'nav.offline': 'OFFLINE',

      // Generate Calendar Page
      'calendar.title': 'CALENDAR GENERATION',
      'calendar.subtitle': 'Morocco Football Federation',
      'calendar.excelLabel': 'Excel File:',
      'calendar.configLabel': 'Competition: (League)',
      'calendar.selectFile': 'Select Excel file',
      'calendar.selectConfig': 'Select competition',
      'calendar.noFileSelected': 'No file selected',
      'calendar.generateButton': 'Generate Calendar',
      'calendar.loading': 'Generating calendar...',
      'calendar.success': 'Calendar generated and downloaded successfully!',
      'calendar.errorFileConfig': 'Please select Excel file and competition.',
      'calendar.errorGenerate': 'Error generating calendar',
      'calendar.errorUnknown': 'Unknown error',

      // Config Options
      'config.botolaD1': 'Botola D1',
      'config.botolaD2': 'Botola D2',
      'config.cnpff1': 'CNPFF1',
      'config.cnpff2': 'CNPFF2',

      // Endpoints Page
      'endpoints.title': 'Connectivity Status',
      'endpoints.subtitle': 'Backend End Points',
      'endpoints.verifyAll': 'Verify All',
      'endpoints.customTitle': 'Custom Endpoint',
      'endpoints.customName': 'Endpoint name (optional)',
      'endpoints.customUrl': 'https://example.com/api/endpoint',
      'endpoints.addButton': 'Add',
      'endpoints.verifying': 'Verifying...',
      'endpoints.verify': 'Verify',
      'endpoints.notVerified': 'Not verified',
      'endpoints.lastCheck': 'Last check:',
      'endpoints.remove': 'Remove custom endpoint',

      // Logs Page
      'logs.title': 'System Logs',
      'logs.updateButton': 'Update Logs',
      'logs.clearButton': 'Clear Logs',
      'logs.backendInfo': 'Backend Information',
      'logs.noLogs': 'No logs available. Press "Update Logs" to load.',
      'logs.infoTitle': 'Information:',
      'logs.info1': 'Logs are updated automatically every 10 seconds',
      'logs.info2': 'Backend status is checked every 5 seconds',
      'logs.info3': 'Use "Update Logs" for immediate manual update',
      'logs.info4': 'If backend is offline, verify Spring Boot is running on port 8080',

      // Error Messages
      'error.cors': 'CORS or server not responding',
      'error.notFound': 'Endpoint not found (404)',
      'error.serverError': 'Internal server error (500)',
      'error.connection': 'Connection error',
      'error.gettingLogs': 'Error getting logs from server',
      'error.details': 'Details:'
    },
    ar: {
      // Navigation
      'nav.generateCalendar': 'إنشاء الجدول',
      'nav.endpoints': 'نقاط النهاية',
      'nav.logs': 'السجلات',
      'nav.backend': 'الخادم',
      'nav.online': 'متصل',
      'nav.offline': 'غير متصل',

      // Generate Calendar Page
      'calendar.title': 'توليد التقويم',
      'calendar.subtitle': 'الاتحاد المغربي لكرة القدم',
      'calendar.excelLabel': 'ملف إكسل:',
      'calendar.configLabel': 'المنافسة: (League)',
      'calendar.selectFile': 'اختر ملف إكسل',
      'calendar.selectConfig': 'اختر المنافسة',
      'calendar.noFileSelected': 'لم يتم اختيار ملف',
      'calendar.generateButton': 'إنشاء الجدول',
      'calendar.loading': 'جاري إنشاء الجدول...',
      'calendar.success': 'تم إنشاء الجدول وتنزيله بنجاح!',
      'calendar.errorFileConfig': 'يرجى اختيار ملف إكسل والمنافسة.',
      'calendar.errorGenerate': 'خطأ في إنشاء الجدول',
      'calendar.errorUnknown': 'خطأ غير معروف',

      // Config Options
      'config.botolaD1': 'البطولة الأولى',
      'config.botolaD2': 'البطولة الثانية',
      'config.cnpff1': 'الاتحاد الأول',
      'config.cnpff2': 'الاتحاد الثاني',

      // Endpoints Page
      'endpoints.title': 'حالة الاتصال',
      'endpoints.subtitle': 'نقاط نهاية الخادم',
      'endpoints.verifyAll': 'التحقق من الكل',
      'endpoints.customTitle': 'نقطة نهاية مخصصة',
      'endpoints.customName': 'اسم النقطة (اختياري)',
      'endpoints.customUrl': 'https://example.com/api/endpoint',
      'endpoints.addButton': 'إضافة',
      'endpoints.verifying': 'جاري التحقق...',
      'endpoints.verify': 'تحقق',
      'endpoints.notVerified': 'غير محقق',
      'endpoints.lastCheck': 'آخر فحص:',
      'endpoints.remove': 'إزالة النقطة المخصصة',

      // Logs Page
      'logs.title': 'سجلات النظام',
      'logs.updateButton': 'تحديث السجلات',
      'logs.clearButton': 'مسح السجلات',
      'logs.backendInfo': 'معلومات الخادم',
      'logs.noLogs': 'لا توجد سجلات متاحة. اضغط "تحديث السجلات" للتحميل.',
      'logs.infoTitle': 'معلومات:',
      'logs.info1': 'يتم تحديث السجلات تلقائياً كل 10 ثوانِ',
      'logs.info2': 'يتم فحص حالة الخادم كل 5 ثوانِ',
      'logs.info3': 'استخدم "تحديث السجلات" للتحديث الفوري',
      'logs.info4': 'إذا كان الخادم غير متصل، تحقق من تشغيل Spring Boot على المنفذ 8080',

      // Error Messages
      'error.cors': 'CORS أو الخادم لا يستجيب',
      'error.notFound': 'النقطة غير موجودة (404)',
      'error.serverError': 'خطأ داخلي في الخادم (500)',
      'error.connection': 'خطأ في الاتصال',
      'error.gettingLogs': 'خطأ في الحصول على السجلات من الخادم',
      'error.details': 'التفاصيل:'
    }
  };

  get currentLang() {
    return this.currentLanguage();
  }

  get isRTL() {
    return this.currentLanguage() === 'ar';
  }

  setLanguage(lang: 'en' | 'ar') {
    this.currentLanguage.set(lang);
    localStorage.setItem('selectedLanguage', lang);

    // Update document direction and language
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  translate(key: string): string {
    return this.translations[this.currentLanguage()][key] || key;
  }

  constructor() {
    // Load saved language preference
    const savedLang = localStorage.getItem('selectedLanguage') as 'en' | 'ar';
    if (savedLang) {
      this.setLanguage(savedLang);
    } else {
      this.setLanguage('en'); // Default to English
    }
  }
}
