# Compliance Documents System - Quick Start Guide

## ✅ System Ready!

All migrations applied, storage bucket created, and navigation links added.

---

## 📍 How to Access the Pages

### **For Admins:**

1. **Compliance Documents Settings**
   - **URL:** `/settings/compliance-documents`
   - **Sidebar:** Settings → Compliance Docs
   - **Features:**
     - Country tabs (UK, IE, US)
     - Seed recommended defaults button
     - Enable/disable requirements
     - Delete requirements

2. **Review Staff Submissions**
   - **URL:** `/settings/compliance-documents/review`
   - **Sidebar:** Settings → Review Submissions
   - **Features:**
     - View pending submissions
     - Approve/reject documents
     - Add rejection reasons
     - See review history

---

### **For Staff:**

1. **My Compliance Documents**
   - **URL:** `/compliance`
   - **Sidebar:** My Profile → My Compliance
   - **Features:**
     - View required documents
     - Upload files (PDF, JPG, PNG, WEBP up to 5MB)
     - Submit reference numbers
     - Track status (Approved, Pending, Rejected, Expired, Not Uploaded)
     - Replace rejected documents

---

## 🚀 First-Time Setup (Admin)

1. **Login as Admin**
2. **Go to:** Settings → Compliance Docs
3. **Select country tab** (UK/IE/US)
4. **Click "Seed Recommended Defaults"** (if no requirements exist)
5. **Review and enable/disable requirements** as needed
6. **Done!** Staff can now see and upload documents

---

## 📊 What Defaults Are Seeded?

### **UK:**
- ✅ Right to Work (required, upload)
- ✅ Contract of Employment (required, upload)
- ✅ Pay Records / Payslips (required, upload)
- ✅ Working Time & Holiday Records (required, upload, expires in 12 months)

### **Ireland (IE):**
- ✅ Payroll Records (required, upload)
- ✅ PPS Number / Payroll ID (required, reference only)
- ⚠️ Permission to Work (conditional, upload, expires in 12 months)
- ✅ Contract of Employment (required, upload)
- ✅ Working Time & Holiday Records (required, upload, expires in 12 months)

### **United States (US):**
- ✅ Form I-9 Employment Eligibility (required, both file + reference)
- ✅ Form W-4 Tax Withholding (required, upload)
- ✅ Payroll & Wage-Hour Records (required, upload)

---

## 🔐 Security Features

✅ **Private storage bucket** - All files are private and access-controlled  
✅ **RLS policies** - Staff can only see their own documents, admins can see all tenant documents  
✅ **Signed URLs** - Temporary secure links for file viewing (1 hour expiry)  
✅ **No service role key exposure** - All client operations use anon key + RLS  
✅ **File validation** - Type and size limits enforced server-side  
✅ **Collection method enforcement** - API validates upload/reference/both requirements  

---

## 🎯 Typical Workflow

### **Admin Side:**
1. Configure requirements (Settings → Compliance Docs)
2. Staff get notified of required documents
3. Admin reviews submissions (Settings → Review Submissions)
4. Approve or reject with reason
5. Track expiring documents

### **Staff Side:**
1. Login and go to "My Compliance"
2. See required documents with status
3. Upload files and/or enter reference numbers
4. Wait for admin review
5. Re-upload if rejected
6. Get notified when documents are expiring

---

## 🐛 Troubleshooting

**Problem:** Pages not loading?
- **Solution:** Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- Check browser console for errors

**Problem:** Can't upload files?
- **Solution:** 
  - Check file size (max 5MB)
  - Check file type (PDF, JPG, PNG, WEBP only)
  - Check storage bucket exists in Supabase dashboard

**Problem:** Storage errors?
- **Solution:** 
  - Verify bucket `compliance-documents` exists in Supabase
  - Check RLS policies are enabled on storage.objects
  - Verify user is authenticated

**Problem:** Not seeing requirements?
- **Solution:**
  - Admin: Seed defaults for your country
  - Staff: Check with admin if requirements are enabled
  - Verify role/location filters if "applies_to_all" is false

---

## 📦 Database Tables

1. **`tenant_compliance_requirements`** - Admin configuration
2. **`staff_compliance_documents`** - Staff uploads and status

## 🪣 Storage

- **Bucket:** `compliance-documents` (private)
- **Path structure:** `{tenantId}/{userId}/{docType}/{yyyy-mm}/{uuid}.{ext}`

---

## 🎉 You're All Set!

Refresh your app and navigate to the pages using the sidebar links above.

For technical details, see: `COMPLIANCE_SYSTEM_BUILD_PLAN.md`



