import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Chat: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chat
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Chat interface will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Chat; 