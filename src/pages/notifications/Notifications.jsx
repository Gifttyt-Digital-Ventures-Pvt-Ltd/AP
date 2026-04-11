import React, { useState, useEffect } from 'react';
import {
  useGetNotificationsQuery,
  useGetPendingNotificationsQuery,
} from '../../Services/apiSlice';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  Bell,
  Mail,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
  FileText,
  CreditCard
} from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const notificationTypeIcons = {
  'PO Submitted for Approval': ShoppingCart,
  'PO Approved': CheckCircle,
  'PO Rejected': AlertCircle,
  'Invoice Uploaded': FileText,
  'Invoice Approved': CheckCircle,
  'Payment Processed': CreditCard,
  'Payment Batch Created': CreditCard,
  'Payment Batch Approved': CheckCircle
};

const notificationTypeColors = {
  'PO Submitted for Approval': 'bg-yellow-500',
  'PO Approved': 'bg-green-500',
  'PO Rejected': 'bg-red-500',
  'Invoice Uploaded': 'bg-blue-500',
  'Invoice Approved': 'bg-green-500',
  'Payment Processed': 'bg-green-500',
  'Payment Batch Created': 'bg-yellow-500',
  'Payment Batch Approved': 'bg-green-500'
};

const Notifications = () => {
  const {
    data: notificationsData = [],
    isLoading: notificationsLoading,
    isFetching: notificationsFetching,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery({ limit: 100 });
  const {
    data: pendingNotificationsData = [],
    isLoading: pendingLoading,
    isFetching: pendingFetching,
    isError: pendingError,
    refetch: refetchPendingNotifications,
  } = useGetPendingNotificationsQuery();
  const [activeTab, setActiveTab] = useState('all');

  const notifications = Array.isArray(notificationsData) ? notificationsData : [];
  const pendingNotifications = Array.isArray(pendingNotificationsData)
    ? pendingNotificationsData
    : [];
  const loading = notificationsLoading || pendingLoading;
  const refreshing = notificationsFetching || pendingFetching;

  const fetchData = async () => {
    try {
      await Promise.all([refetchNotifications(), refetchPendingNotifications()]);
    } catch {
      // Query errors are handled by error states.
    }
  };

  useEffect(() => {
    if (notificationsError || pendingError) {
      toast.error('Failed to load notifications');
    }
  }, [notificationsError, pendingError]);

  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.sent).length,
    pending: notifications.filter(n => !n.sent).length,
    failed: notifications.filter(n => n.error_message).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notifications-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Email Notifications</h1>
          <p className="text-muted-foreground">System notification queue and history</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Email Sending</p>
              <p className="text-sm text-blue-600">
                Notifications are queued here and would be processed by a background email service.
                In production, integrate with SendGrid, SES, or your preferred email provider.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Notifications</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending
            {pendingNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingNotifications.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No notifications yet. Notifications are created when POs are submitted/approved or payments are processed.
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notif) => {
                    const Icon = notificationTypeIcons[notif.notification_type] || Bell;
                    return (
                      <TableRow key={notif.id} data-testid={`notification-row-${notif.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${notificationTypeColors[notif.notification_type] || 'bg-gray-500'}`}>
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            <span className="text-sm">{notif.notification_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notif.recipient_name}</p>
                            <p className="text-xs text-muted-foreground">{notif.recipient_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{notif.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {notif.entity_type}: {notif.entity_number || notif.entity_id.slice(0, 8)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {notif.sent ? (
                            <Badge className="bg-green-500 text-white">Sent</Badge>
                          ) : notif.error_message ? (
                            <Badge variant="destructive">Failed</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(notif.created_at)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Notifications</CardTitle>
              <CardDescription>Notifications waiting to be sent by the email service</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingNotifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No pending notifications
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingNotifications.map((notif) => {
                      const Icon = notificationTypeIcons[notif.notification_type] || Bell;
                      return (
                        <TableRow key={notif.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="text-sm">{notif.notification_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{notif.recipient_name}</p>
                              <p className="text-xs text-muted-foreground">{notif.recipient_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{notif.subject}</TableCell>
                          <TableCell className="text-sm">{formatDate(notif.created_at)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;

