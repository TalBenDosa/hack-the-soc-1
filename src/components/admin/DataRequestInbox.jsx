import React, { useState, useEffect } from 'react';
import { DataRequest } from '@/entities/DataRequest';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Inbox, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  MessageSquare,
  Calendar,
  User,
  Mail
} from 'lucide-react';

export default function DataRequestInbox() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const allRequests = await DataRequest.list('-created_date');
      setRequests(allRequests || []);
    } catch (error) {
      console.error('Error loading data requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getRequestTypeLabel = (type) => {
    const types = {
      access: 'עיון במידע',
      rectification: 'תיקון מידע',
      erasure: 'מחיקת מידע',
      portability: 'ניידות מידע',
      restriction: 'הגבלת עיבוד',
      objection: 'התנגדות לעיבוד'
    };
    return types[type] || type;
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setNewStatus(request.status);
    setShowModal(true);
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;

    try {
      const updateData = {
        status: newStatus,
        admin_notes: adminNotes
      };

      if (newStatus === 'completed' && !selectedRequest.response_date) {
        updateData.response_date = new Date().toISOString();
      }

      await DataRequest.update(selectedRequest.id, updateData);
      
      setShowModal(false);
      setSelectedRequest(null);
      await loadRequests();
      
    } catch (error) {
      console.error('Error updating request:', error);
      alert('שגיאה בעדכון הבקשה');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyLevel = (createdDate) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated > 25) {
      return { level: 'urgent', color: 'text-red-400', text: 'דחוף! (מעל 25 יום)' };
    } else if (daysSinceCreated > 20) {
      return { level: 'warning', color: 'text-yellow-400', text: 'זמן קצר (מעל 20 יום)' };
    }
    return { level: 'normal', color: 'text-green-400', text: `${daysSinceCreated} ימים` };
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
        <p className="text-white mt-4">טוען בקשות נתונים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl text-white flex items-center gap-3">
              <Inbox className="w-7 h-7 text-teal-400" />
              תיבת דרישות נתונים (DSR)
            </CardTitle>
            <Button onClick={loadRequests} variant="outline" className="border-slate-600 text-slate-300">
              <RefreshCw className="w-4 h-4 mr-2" />
              רענן
            </Button>
          </div>
          <p className="text-slate-400">
            ניהול בקשות נתונים אישיים מהמשתמשים של Hack The SOC
          </p>
        </CardHeader>
      </Card>

      {requests.length === 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center p-8">
            <Inbox className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl text-slate-400 mb-2">אין בקשות חדשות</h3>
            <p className="text-slate-500">כל בקשות הנתונים טופלו או שלא הוגשו בקשות עדיין.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">פרטי מבקש</TableHead>
                    <TableHead className="text-slate-300">סוג בקשה</TableHead>
                    <TableHead className="text-slate-300">סטטוס</TableHead>
                    <TableHead className="text-slate-300">תאריך יצירה</TableHead>
                    <TableHead className="text-slate-300">דחיפות</TableHead>
                    <TableHead className="text-slate-300">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const urgency = getUrgencyLevel(request.created_date);
                    
                    return (
                      <TableRow key={request.id} className="border-slate-700 hover:bg-slate-700/30">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-white font-medium">
                              <User className="w-4 h-4 text-teal-400" />
                              {request.requester_name}
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Mail className="w-3 h-3" />
                              {request.requester_email}
                            </div>
                            {request.requester_phone && (
                              <div className="text-slate-400 text-sm">
                                📞 {request.requester_phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {getRequestTypeLabel(request.request_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(request.status)} border flex items-center gap-1 w-fit`}>
                            {getStatusIcon(request.status)}
                            {request.status === 'pending' && 'ממתין'}
                            {request.status === 'in_progress' && 'בטיפול'}
                            {request.status === 'completed' && 'הושלם'}
                            {request.status === 'rejected' && 'נדחה'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-300">
                            <Calendar className="w-4 h-4" />
                            {formatDate(request.created_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={urgency.color}>{urgency.text}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleViewRequest(request)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            טפל
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-teal-400" />
                בקשת נתונים #{selectedRequest.id?.slice(-8)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Request Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <h3 className="font-semibold text-white mb-2">פרטי המבקש</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>שם:</strong> {selectedRequest.requester_name}</p>
                    <p><strong>דוא"ל:</strong> {selectedRequest.requester_email}</p>
                    {selectedRequest.requester_phone && (
                      <p><strong>טלפון:</strong> {selectedRequest.requester_phone}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">פרטי הבקשה</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>סוג:</strong> {getRequestTypeLabel(selectedRequest.request_type)}</p>
                    <p><strong>תאריך יצירה:</strong> {formatDate(selectedRequest.created_date)}</p>
                    <p><strong>סטטוס נוכחי:</strong> 
                      <Badge className={`${getStatusColor(selectedRequest.status)} mr-2`}>
                        {selectedRequest.status}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div>
                <h3 className="font-semibold text-white mb-3">פירוט הבקשה</h3>
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedRequest.request_details}</p>
                </div>
              </div>

              {/* Status Update */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-white mb-3">עדכון סטטוס</h3>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="pending">ממתין</SelectItem>
                      <SelectItem value="in_progress">בטיפול</SelectItem>
                      <SelectItem value="completed">הושלם</SelectItem>
                      <SelectItem value="rejected">נדחה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedRequest.response_date && (
                  <div>
                    <h3 className="font-semibold text-white mb-3">תאריך מענה</h3>
                    <p className="text-slate-300">{formatDate(selectedRequest.response_date)}</p>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <h3 className="font-semibold text-white mb-3">הערות אדמין</h3>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white h-32"
                  placeholder="הוסף הערות על הטיפול בבקשה..."
                />
              </div>
            </div>

            <DialogFooter className="flex gap-3">
              <Button
                onClick={() => setShowModal(false)}
                variant="outline"
                className="border-slate-600 text-slate-300"
              >
                ביטול
              </Button>
              <Button
                onClick={handleUpdateRequest}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                עדכן בקשה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}