# Google Cloud Storage Setup Guide for Tribal Gnosis

## Step 1: Create Google Cloud Project & Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `tribal-gnosis-storage`
4. Note your Project ID (e.g., `tribal-gnosis-storage-12345`)

### 1.2 Enable Google Cloud Storage API
1. Navigate to "APIs & Services" → "Library"
2. Search for "Cloud Storage API"
3. Click "Enable"

### 1.3 Create Storage Bucket
1. Navigate to "Cloud Storage" → "Browser"
2. Click "Create Bucket"
3. Bucket name: `tribal-gnosis-files` (must be globally unique)
4. Region: Choose closest to your users (e.g., `us-central1`)
5. Storage class: "Standard"
6. Access control: "Fine-grained"
7. Click "Create"

## Step 2: Service Account Setup

### 2.1 Create Service Account
1. Navigate to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Name: `tribal-gnosis-storage`
4. Description: `Storage service for Tribal Gnosis platform`
5. Click "Create and Continue"

### 2.2 Grant Permissions
Add these roles to the service account:
- `Storage Admin` (for full bucket management)
- `Storage Object Admin` (for file operations)

### 2.3 Create Service Account Key
1. Click on your new service account
2. Go to "Keys" tab → "Add Key" → "Create new key"
3. Choose "JSON" format
4. Download the key file (save as `gcp-service-account.json`)
5. **Keep this file secure!**

## Step 3: Environment Variables Setup

Add these to your Render environment variables:

```bash
# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_STORAGE_BUCKET=tribal-gnosis-files
GOOGLE_APPLICATION_CREDENTIALS=/opt/render/project/src/tribal-gnosis-backend/gcp-service-account.json
```

## Step 4: Install Dependencies

Add to your package.json:

```bash
npm install @google-cloud/storage multer @types/multer
```

## Step 5: Upload Service Account Key to Render

### Method 1: Environment Variable (Recommended)
1. Convert your service account JSON to base64:
   ```bash
   base64 -i gcp-service-account.json
   ```
2. Add environment variable in Render:
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY=[base64-encoded-key]
   ```

### Method 2: File Upload (Alternative)
1. Add the JSON file to your repository in a secure location
2. Set the path in environment variables

## Step 6: Integration Code

Here's how to integrate Google Cloud Storage into your existing endpoints:

```typescript
// Add to your main index.ts
import { cloudStorageService } from './services/cloudStorageService';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize storage service
app.listen(port, async () => {
  console.log(\`Backend running on port \${port}\`);
  try {
    await connectDB();
    await cloudStorageService.initializeBucket(); // Initialize GCS
  } catch (error) {
    console.error('Startup error:', error);
  }
});

// Enhanced file upload endpoint
app.post('/api/files/upload/:tenantId', 
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      // Upload to Google Cloud Storage
      const result = await cloudStorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        tenantId,
        'documents'
      );

      // Save metadata to MongoDB
      const knowledgeItem = new KnowledgeItem({
        tenantId,
        title: file.originalname,
        content: result.publicUrl, // Store the URL instead of content
        category: 'uploaded-file',
        metadata: {
          source: 'file-upload',
          contentType: file.mimetype,
          size: file.size,
          gcsPath: result.filePath,
          publicUrl: result.publicUrl
        }
      });

      await knowledgeItem.save();

      res.status(201).json({
        message: 'File uploaded successfully',
        file: result,
        knowledgeItemId: knowledgeItem._id
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  }
);
```

## Step 7: Security Considerations

### 7.1 Bucket Security
1. Set up proper IAM policies
2. Enable versioning for important files
3. Configure lifecycle policies for cost optimization

### 7.2 Access Control
```typescript
// Example: Secure file access
app.get('/api/files/download/:tenantId/:fileId', async (req, res) => {
  try {
    // Verify user has access to this tenant
    const { tenantId, fileId } = req.params;
    // Add your authentication/authorization logic here
    
    const knowledgeItem = await KnowledgeItem.findOne({
      _id: fileId,
      tenantId: tenantId
    });
    
    if (!knowledgeItem) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Get file from Google Cloud Storage
    const fileBuffer = await cloudStorageService.downloadFile(
      knowledgeItem.metadata.gcsPath
    );
    
    res.setHeader('Content-Type', knowledgeItem.metadata.contentType);
    res.setHeader('Content-Disposition', \`attachment; filename="\${knowledgeItem.title}"\`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Download failed' });
  }
});
```

## Step 8: Cost Optimization

### 8.1 Storage Classes
- **Standard**: Frequently accessed files
- **Nearline**: Monthly access (30-day minimum)  
- **Coldline**: Quarterly access (90-day minimum)
- **Archive**: Yearly access (365-day minimum)

### 8.2 Lifecycle Policies
```json
{
  "rule": [
    {
      "action": { "type": "SetStorageClass", "storageClass": "NEARLINE" },
      "condition": { "age": 30, "matchesStorageClass": ["STANDARD"] }
    },
    {
      "action": { "type": "SetStorageClass", "storageClass": "COLDLINE" },
      "condition": { "age": 90, "matchesStorageClass": ["NEARLINE"] }
    }
  ]
}
```

## Step 9: Monitoring & Analytics

### 9.1 Storage Usage Dashboard
The admin dashboard endpoints we created will automatically show:
- Total storage usage across all tenants
- Storage breakdown by tenant
- Cost analysis and overage billing
- File type distribution

### 9.2 Google Cloud Monitoring
1. Enable Cloud Monitoring
2. Set up alerts for:
   - Storage usage thresholds
   - API request spikes
   - Error rates

## Pricing Estimate

### Google Cloud Storage Costs:
- **Standard Storage**: $0.020 per GB/month
- **Operations**: $0.0004 per 1K operations
- **Network Egress**: $0.12 per GB (after 1GB free)

### Example for 10 companies with 20GB each:
- Storage: 200GB × $0.020 = $4.00/month
- Operations: ~10K/month × $0.0004 = $4.00/month
- **Total GCS Cost**: ~$8.00/month

Compare to MongoDB Atlas storage: $40/month for same capacity
**Savings**: $32/month (80% reduction!)

## Implementation Timeline

### Week 1: Basic Setup
- [ ] Create Google Cloud project
- [ ] Set up service account and permissions
- [ ] Install dependencies
- [ ] Configure environment variables

### Week 2: Integration
- [ ] Implement file upload endpoints
- [ ] Add multer middleware
- [ ] Test file operations
- [ ] Update admin dashboard

### Week 3: Migration
- [ ] Create migration script for existing files
- [ ] Update knowledge item storage references
- [ ] Implement lifecycle policies
- [ ] Performance testing

### Week 4: Production
- [ ] Deploy to production
- [ ] Monitor usage and costs
- [ ] Set up alerts and backup strategies
- [ ] Documentation and training

## Next Steps

1. **Set up Google Cloud project** following steps 1-3
2. **Add environment variables** to Render
3. **Install dependencies** in package.json
4. **Deploy the storage service** we created
5. **Test file uploads** with the new endpoints
6. **Monitor costs and usage** via admin dashboard

This implementation will give you:
- ✅ Scalable file storage (unlimited capacity)
- ✅ 80% cost reduction vs MongoDB storage
- ✅ Global CDN for fast file access
- ✅ Professional admin monitoring dashboard
- ✅ Automatic cleanup and lifecycle management