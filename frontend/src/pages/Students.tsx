import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Students: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Students Management
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Students management interface will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Students; 