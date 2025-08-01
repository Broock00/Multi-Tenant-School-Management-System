import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Exams: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Exams Management
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Exams management interface will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Exams; 