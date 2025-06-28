import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Chip,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security,
  Notifications,
  Storage,
  Language,
} from '@mui/icons-material';
import { systemSettingsAPI, usersAPI, subscriptionPlansAPI } from '../services/api';
import { User } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';

interface SystemSettings {
  maintenanceMode: boolean;
  maintenanceBypassUsers: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  dataRetention: number;
  maxFileSize: number;
  sessionTimeout: number;
  language: string;
  latest_backup_file?: string;
}

// Helper to map camelCase state to snake_case API keys
function toSnakeCase(obj: any) {
  return {
    maintenance_mode: obj.maintenanceMode,
    maintenance_bypass_users: obj.maintenanceBypassUsers,
    email_notifications: obj.emailNotifications,
    sms_notifications: obj.smsNotifications,
    auto_backup: obj.autoBackup,
    backup_frequency: obj.backupFrequency,
    data_retention: obj.dataRetention,
    max_file_size: obj.maxFileSize,
    session_timeout: obj.sessionTimeout,
    language: obj.language,
  };
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [plansSaved, setPlansSaved] = useState(false);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await systemSettingsAPI.get();
        setSettings({
          maintenanceMode: response.data.maintenance_mode ?? false,
          maintenanceBypassUsers: response.data.maintenance_bypass_users ?? '',
          emailNotifications: response.data.email_notifications ?? false,
          smsNotifications: response.data.sms_notifications ?? false,
          autoBackup: response.data.auto_backup ?? false,
          backupFrequency: response.data.backup_frequency ?? 'daily',
          dataRetention: response.data.data_retention ?? 365,
          maxFileSize: response.data.max_file_size ?? 10,
          sessionTimeout: response.data.session_timeout ?? 30,
          language: response.data.language ?? 'en',
          latest_backup_file: response.data.latest_backup_file ?? '',
        });
      } catch (err: any) {
        setError('Failed to load settings');
      }
    };
    fetchSettings();
  }, []);

  React.useEffect(() => {
    if (user && user.role === 'super_admin') {
      setPlansLoading(true);
      subscriptionPlansAPI.getPlans()
        .then(res => setPlans(Array.isArray(res.data) ? res.data : res.data.results || []))
        .catch(() => setPlansError('Failed to load plans'))
        .finally(() => setPlansLoading(false));
    }
  }, [user]);

  const handleSettingChange = (setting: keyof SystemSettings, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, [setting]: value } : prev);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      await systemSettingsAPI.update(toSnakeCase(settings));
      setSaved(true);
      setError(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError('Failed to save settings: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Fetch user options for autocomplete
  const fetchUserOptions = async (input: string) => {
    setUserSearchLoading(true);
    try {
      const response = await usersAPI.getUsers({ q: input });
      setUserOptions(response.data.results || response.data || []);
    } catch (err) {
      setUserOptions([]);
    }
    setUserSearchLoading(false);
  };

  const handlePlanChange = (planId: number, field: string, value: any) => {
    setPlans(prev => prev.map(plan => plan.id === planId ? { ...plan, [field]: value } : plan));
    setPlansSaved(false);
    setPlansError(null);
  };

  const handleSavePlan = async (plan: any) => {
    try {
      await subscriptionPlansAPI.updatePlan(plan.id, plan);
      setPlansSaved(true);
      setPlansError(null);
      setTimeout(() => setPlansSaved(false), 3000);
    } catch (err: any) {
      setPlansError('Failed to save plan: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (!settings) {
    return <Box sx={{ p: 3 }}><Alert severity="info">Loading settings...</Alert></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        System Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure platform-wide settings and preferences
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        {/* System Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              System Configuration
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                />
              }
              label="Maintenance Mode"
              sx={{ mb: 2 }}
            />
            
            {user && user.role === 'super_admin' && (
              <Autocomplete
                multiple
                freeSolo
                options={userOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : (option.username || option.email)}
                value={(settings.maintenanceBypassUsers || '').split(',').map(u => u.trim()).filter(Boolean)}
                onChange={(_, value) => {
                  // Map selected values to username or email
                  const usernames = value.map(v =>
                    typeof v === 'string' ? v : (v.username || v.email)
                  );
                  handleSettingChange('maintenanceBypassUsers', usernames.join(','));
                }}
                onInputChange={(_, value) => fetchUserOptions(value)}
                filterSelectedOptions
                loading={userSearchLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Maintenance Bypass Users (search usernames or emails)"
                    margin="normal"
                    helperText="Users who can access the system during maintenance mode."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {userSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}
            
            <TextField
              fullWidth
              label="Session Timeout (minutes)"
              type="number"
              value={settings.sessionTimeout ?? ''}
              onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Data Retention (days)"
              type="number"
              value={settings.dataRetention ?? ''}
              onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Max File Size (MB)"
              type="number"
              value={settings.maxFileSize ?? ''}
              onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
              margin="normal"
            />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Notifications sx={{ mr: 1, verticalAlign: 'middle' }} />
              Notification Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                />
              }
              label="Email Notifications"
              sx={{ mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.smsNotifications}
                  onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                />
              }
              label="SMS Notifications"
              sx={{ mb: 2 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoBackup}
                  onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                />
              }
              label="Automatic Backup"
              sx={{ mb: 2 }}
            />
            <TextField
              select
              fullWidth
              label="Backup Frequency"
              value={settings.backupFrequency ?? ''}
              onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
              margin="normal"
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </TextField>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Language sx={{ mr: 1, verticalAlign: 'middle' }} />
              Language & Localization
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <TextField
              fullWidth
              select
              label="Default Language"
              value={settings.language ?? ''}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              margin="normal"
              SelectProps={{
                native: true,
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </TextField>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Storage sx={{ mr: 1, verticalAlign: 'middle' }} />
              System Status
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Database Status
              </Typography>
              <Chip label="Connected" color="success" size="small" />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Storage Usage
              </Typography>
              <Chip label="75% Used" color="warning" size="small" />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Last Backup
              </Typography>
              <Chip label="2 hours ago" color="info" size="small" />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Plan Management Section for Super Admins */}
      {user && user.role === 'super_admin' && (
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom>
            Subscription Plan Management
          </Typography>
          {plansSaved && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Plan settings saved successfully!
            </Alert>
          )}
          {plansError && (
            <Alert severity="error" sx={{ mb: 2 }}>{plansError}</Alert>
          )}
          {plansLoading ? (
            <CircularProgress />
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
              {Array.isArray(plans) ? plans.map(plan => (
                <Card key={plan.id} sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} Plan
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <TextField
                      fullWidth
                      label="Max Students"
                      type="number"
                      value={plan.max_students ?? ''}
                      onChange={e => handlePlanChange(plan.id, 'max_students', parseInt(e.target.value))}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Max Teachers"
                      type="number"
                      value={plan.max_teachers ?? ''}
                      onChange={e => handlePlanChange(plan.id, 'max_teachers', parseInt(e.target.value))}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Max Secretaries"
                      type="number"
                      value={plan.max_secretaries ?? ''}
                      onChange={e => handlePlanChange(plan.id, 'max_secretaries', parseInt(e.target.value))}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Max Emails per Month"
                      type="number"
                      value={plan.max_emails_per_month ?? ''}
                      onChange={e => handlePlanChange(plan.id, 'max_emails_per_month', parseInt(e.target.value))}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Max SMS per Month"
                      type="number"
                      value={plan.max_sms_per_month ?? ''}
                      onChange={e => handlePlanChange(plan.id, 'max_sms_per_month', parseInt(e.target.value))}
                      margin="normal"
                    />
                    <Box sx={{ mt: 2, textAlign: 'right' }}>
                      <Button
                        variant="contained"
                        onClick={() => handleSavePlan(plan)}
                        size="medium"
                      >
                        Save Plan
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )) : null}
            </Box>
          )}
        </Box>
      )}

      {/* Save Button */}
      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          size="large"
        >
          Save Settings
        </Button>
      </Box>

      {settings.latest_backup_file && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            href={"/api/v1/system-settings/download-backup/"}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            Download Latest Backup
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Settings; 