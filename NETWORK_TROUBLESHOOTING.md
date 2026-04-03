# Network Troubleshooting Guide

## Error: "getaddrinfo EAI_AGAIN api.mistral.ai"

This error indicates a DNS resolution failure or network connectivity issue when trying to connect to Mistral AI API.

### Possible Causes:

1. **No Internet Connection**
   - Check if you can access other websites
   - Verify your network connection

2. **DNS Resolution Issues**
   - Your DNS server cannot resolve `api.mistral.ai`
   - Try using a different DNS server (e.g., Google DNS: 8.8.8.8, 8.8.4.4)

3. **Firewall/Proxy Blocking**
   - Corporate firewall or proxy may be blocking the API call
   - Check firewall settings
   - Configure proxy if needed

4. **VPN Issues**
   - If using VPN, try disconnecting and reconnecting
   - Some VPNs may block API calls

### Solutions:

#### 1. Check Internet Connection
```bash
# Test DNS resolution
nslookup api.mistral.ai

# Test connectivity
ping api.mistral.ai
```

#### 2. Configure DNS (Windows)
1. Open Network Settings
2. Change adapter options
3. Right-click your network adapter → Properties
4. Select "Internet Protocol Version 4 (TCP/IPv4)" → Properties
5. Use the following DNS servers:
   - Preferred: 8.8.8.8
   - Alternate: 8.8.4.4

#### 3. Configure Proxy (if needed)
If you're behind a corporate proxy, you may need to configure axios to use it:

Add to `utils/mistralAI.js`:
```javascript
const HttpsProxyAgent = require('https-proxy-agent');

const axiosConfig = {
  // ... existing config
  httpsAgent: new HttpsProxyAgent('http://proxy-server:port'),
  proxy: false // Disable default proxy
};
```

#### 4. Test API Connection Manually
```bash
# Test with curl
curl -X POST https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"mistral-large-latest","messages":[{"role":"user","content":"test"}]}'
```

#### 5. Check API Key
Ensure your `.env` file has the correct API key:
```
MISTRALAI_API_KEY=your_actual_api_key_here
```

#### 6. Use Alternative Network
- Try using mobile hotspot
- Try different network/WiFi
- Check if other API calls work

### Retry Logic

The application now includes automatic retry logic:
- Retries up to 3 times for network errors
- 2-second delay between retries (increasing)
- Only retries for network-related errors (not authentication errors)

### Still Having Issues?

1. Check Mistral AI Status: https://status.mistral.ai
2. Verify API key is valid and has credits
3. Check server logs for detailed error messages
4. Try generating ILOs for a single unit first to test connectivity
