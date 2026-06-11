import React, { useState, useEffect } from 'react';
import {
  useGetNotificationsQuery,
  useGetPendingNotificationsQuery,
} from '../../Services/apis/notificationsApi';
import { Button } from '../../components/ui/button';
import AppDataTable from '../../components/common/AppDataTable';
import RefreshButton from '../../components/common/RefreshButton';
import { TableCell, TableRow } from '../../components/ui/table';
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

const notificationTableHeader = [
  { key: 'notification_type', title: 'Type' },
  { key: 'recipient', title: 'Recipient' },
  { key: 'subject', title: 'Subject', cellClassName: 'max-w-[200px] truncate' },
  { key: 'entity', title: 'Entity' },
  { key: 'status', title: 'Status' },
  { key: 'created_at', title: 'Created' },
];

const pendingNotificationTableHeader = [
  { key: 'notification_type', title: 'Type' },
  { key: 'recipient', title: 'Recipient' },
  { key: 'subject', title: 'Subject' },
  { key: 'created_at', title: 'Created' },
];

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

  const renderNotificationRow = (notif, rowIndex, headers) => {
    const Icon = notificationTypeIcons[notif.notification_type] || Bell;

    return (
      <TableRow key={notif.id ?? rowIndex} data-testid={`notification-row-${notif.id}`}>
        {headers.map((header) => {
          let value;

          switch (header.key) {
            case 'notification_type':
              value = (
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${notificationTypeColors[notif.notification_type] || 'bg-gray-500'}`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{notif.notification_type}</span>
                </div>
              );
              break;
            case 'recipient':
              value = (
                <div>
                  <p className="font-medium">{notif.recipient_name}</p>
                  <p className="text-xs text-muted-foreground">{notif.recipient_email}</p>
                </div>
              );
              break;
            case 'entity':
              value = (
                <Badge variant="outline">
                  {notif.entity_type}: {notif.entity_number || notif.entity_id?.slice(0, 8)}
                </Badge>
              );
              break;
            case 'status':
              value = notif.sent ? (
                <Badge className="bg-green-500 text-white">Sent</Badge>
              ) : notif.error_message ? (
                <Badge variant="destructive">Failed</Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              );
              break;
            case 'created_at':
              value = formatDate(notif.created_at);
              break;
            default:
              value = notif?.[header.key] || '-';
          }

          return (
            <TableCell key={header.key} className={header.cellClassName}>
              {value}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  const renderPendingNotificationRow = (notif, rowIndex, headers) => {
    const Icon = notificationTypeIcons[notif.notification_type] || Bell;

    return (
      <TableRow key={notif.id ?? rowIndex}>
        {headers.map((header) => {
          let value;

          switch (header.key) {
            case 'notification_type':
              value = (
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{notif.notification_type}</span>
                </div>
              );
              break;
            case 'recipient':
              value = (
                <div>
                  <p className="font-medium">{notif.recipient_name}</p>
                  <p className="text-xs text-muted-foreground">{notif.recipient_email}</p>
                </div>
              );
              break;
            case 'created_at':
              value = formatDate(notif.created_at);
              break;
            default:
              value = notif?.[header.key] || '-';
          }

          return (
            <TableCell key={header.key} className={header.cellClassName}>
              {value}
            </TableCell>
          );
        })}
      </TableRow>
    );
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
        <RefreshButton onClick={fetchData} refreshing={refreshing}>
          Refresh
        </RefreshButton>
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
            <AppDataTable
              tableHeader={notificationTableHeader}
              tableData={notifications}
              renderRow={renderNotificationRow}
              emptyMessage="No notifications yet. Notifications are created when POs are submitted/approved or payments are processed."
            />
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Notifications</CardTitle>
              <CardDescription>Notifications waiting to be sent by the email service</CardDescription>
            </CardHeader>
            <CardContent>
              <AppDataTable
                tableHeader={pendingNotificationTableHeader}
                tableData={pendingNotifications}
                renderRow={renderPendingNotificationRow}
                emptyMessage="No pending notifications"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
