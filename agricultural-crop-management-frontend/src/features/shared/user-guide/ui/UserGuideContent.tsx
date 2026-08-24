import React from 'react';
import { PortalType } from '@/widgets/layout/model/types';
// Removed card imports
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion';
import { BookOpen, Sprout, ShieldAlert, Briefcase, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useNavigate } from 'react-router-dom';

interface UserGuideContentProps {
    portalType?: PortalType;
}

export function UserGuideContent({ portalType }: UserGuideContentProps) {
    const navigate = useNavigate();

    return (
        <div className="w-full p-6 space-y-8">
            <div className="pb-4">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 leading-tight">
                    <BookOpen className="h-6 w-6 text-primary" />
                    Hướng dẫn sử dụng hệ thống
                </h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
                    Tài liệu hướng dẫn chi tiết cách sử dụng các tính năng trên nền tảng VietFuture.
                </p>
            </div>

            {(!portalType || portalType === 'FARMER') && (
                <div className="mb-12">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-green-700 dark:text-green-500 mb-2">
                            <Sprout className="h-6 w-6" />
                            Dành cho Chủ Nông Trại
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            Quản lý nông trại, mùa vụ, và nhân sự
                        </p>
                    </div>
                    <div className="pt-2">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="farmer-1" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-green-700">Bắt đầu & Tổng quan</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Trang tổng quan cung cấp cái nhìn toàn cảnh về nông trại của bạn: thời tiết, công việc hôm nay, và các cảnh báo quan trọng.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/farmer/dashboard')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Tổng quan <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="farmer-2" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-green-700">Quản lý Nông trại & Thửa đất</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Để thêm thửa đất mới, chuyển đến mục Nông trại, chọn "Thêm thửa đất", vẽ trên bản đồ và điền thông tin.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/farmer/farms')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Nông trại <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="farmer-3" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-green-700">Mùa vụ & Công việc</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Tạo mùa vụ mới để bắt đầu theo dõi quá trình trồng trọt. Phân công công việc cho nhân viên và theo dõi tiến độ mỗi ngày.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/farmer/seasons')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Mùa vụ <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="farmer-4" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-green-700">Kho vật tư & Sản phẩm</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Quản lý xuất/nhập kho phân bón, thuốc trừ sâu, và nông sản thu hoạch. Đảm bảo tồn kho luôn được cập nhật chính xác.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/farmer/inventory')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Kho <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="farmer-5" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-green-700">Bán hàng</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Đăng bán sản phẩm thu hoạch lên Marketplace để tiếp cận người mua. Quản lý đơn hàng và doanh thu.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/farmer/marketplace')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Bán hàng <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            )}

            {(!portalType || portalType === 'ADMIN') && (
                <div className="mb-12">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-700 dark:text-blue-500 mb-2">
                            <ShieldAlert className="h-6 w-6" />
                            Dành cho Quản trị viên
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            Quản lý hệ thống, người dùng và giám sát
                        </p>
                    </div>
                    <div className="pt-2">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="admin-1" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-blue-700">Tổng quan quản trị</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Theo dõi các chỉ số quan trọng của toàn hệ thống, số lượng người dùng đang hoạt động và tình trạng các dịch vụ.</p>
                                    <p className="text-sm text-muted-foreground mt-2 font-medium">Chọn mục "Dashboard" ở menu bên trái để truy cập.</p>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="admin-2" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-blue-700">Người dùng & Vai trò</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Quản lý tài khoản, phân quyền và khóa các tài khoản vi phạm chính sách.</p>
                                    <p className="text-sm text-muted-foreground mt-2 font-medium">Chọn mục "Users" ở menu bên trái để truy cập.</p>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="admin-3" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-blue-700">Giám sát Marketplace</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Duyệt các bài đăng bán sản phẩm, theo dõi giao dịch và xử lý khiếu nại từ người mua.</p>
                                    <p className="text-sm text-muted-foreground mt-2 font-medium">Chọn mục "Marketplace" ở menu bên trái để truy cập.</p>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="admin-4" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-blue-700">Sự cố & Cảnh báo</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Xem logs hệ thống, quản lý các thông báo lỗi và cảnh báo bảo mật từ các cảm biến IoT hoặc hệ thống nội bộ.</p>
                                    <p className="text-sm text-muted-foreground mt-2 font-medium">Chọn mục "Alerts" ở menu bên trái để truy cập.</p>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            )}

            {(!portalType || portalType === 'EMPLOYEE') && (
                <div className="mb-12">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-orange-700 dark:text-orange-500 mb-2">
                            <Briefcase className="h-6 w-6" />
                            Dành cho Nhân viên
                        </h2>
                        <p className="text-muted-foreground text-lg">
                            Tiếp nhận công việc, báo cáo tiến độ
                        </p>
                    </div>
                    <div className="pt-2">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="employee-1" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-orange-700">Công việc được giao</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Xem danh sách các công việc bạn cần hoàn thành trong ngày, tuần. Ưu tiên các công việc có đánh dấu quan trọng.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/employee/tasks')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Công việc <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="employee-2" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-orange-700">Báo cáo tiến độ</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Sau khi hoàn thành công việc, hãy chụp ảnh minh chứng và cập nhật trạng thái để quản lý nắm được tiến độ.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/employee/progress')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Tiến độ <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="employee-3" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-orange-700">Workspace Mùa vụ</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Xem thông tin chi tiết về mùa vụ bạn đang tham gia, quy trình chuẩn bị và các tài liệu hướng dẫn kỹ thuật.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/employee/workspace')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Workspace <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="employee-4" className="border-b border-border/40 py-2">
                                <AccordionTrigger className="text-lg font-medium hover:text-orange-700">Bảng lương</AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 text-base text-muted-foreground">
                                    <p>Xem thông tin chấm công, số giờ làm việc, và lịch sử nhận lương.</p>
                                    <Button variant="outline" size="sm" onClick={() => navigate('/employee/payroll')} className="mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 font-medium">
                                        Đi tới Bảng lương <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </div>
            )}
        </div>
    );
}
