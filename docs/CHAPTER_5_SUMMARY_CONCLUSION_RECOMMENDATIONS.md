# Chapter 5: Summary, Conclusion, and Recommendations

## Summary

**TechTrack: An Online Monitoring System for WB Technologies Inc.** was developed from April 2025 to June 2026. Specifically, it aimed to design and develop an online monitoring system focused on improving order management and real-time tracking processes by enabling real-time updates, creating orders, tracking projects, and monitoring progress with visual indicators. The system consists of six core modules: the dashboard module, which provides analytics and operational overview; the product/part management module, which enables adding, modifying, and managing products and process codes; the purchase order module, which supports order creation and management; the task monitoring module, which tracks project progress based on administrative oversight and updates with real-time percentage-based status indicators; the reports module, which generates and displays detailed reports for each created purchase order; and the authentication and user management module, which ensures secure access with role-based permissions for admin, production managers, and customers.

The software development lifecycle used in the study followed the Modified Waterfall Model (Shelly and Rosenblatt, 2012), consisting of four phases: requirements planning, system design, implementation, and testing/deployment. The technologies used included React (frontend framework), Django REST Framework (backend framework), MySQL (database management system), Docker (containerization), and Nginx (reverse proxy), while a development machine with specifications of ASUS Vivobook 12th Generation Intel Core i5-1235U (1.30 GHz), 8 GB Random Access Memory (RAM), 500 GB Hard Disk Drive, and 1920 × 1080 resolution was used for system development.

System testing demonstrated that the system operates effectively under the minimum hardware specification of 2 GB RAM, 128 GB storage, and 1360 × 766 screen resolution. The dashboard module efficiently displays operational analytics and provides administrators with system oversight, while the product/part management module supports efficient categorization and organization of manufacturing processes. The purchase order module enables customers to create and manage orders seamlessly, the task monitoring module provides real-time progress tracking with percentage-based visual indicators, the reports module generates detailed purchase order reports for monitoring and analysis, and the authentication module ensures secure role-based access control for all user types. System testing was evaluated by one Information Technology (IT) expert in web development and full-stack integration.

The system underwent evaluation based on the International Organization for Standardization (ISO) 25010 framework to assess its effectiveness and usability. For product quality, it was evaluated by a total of 82 participants consisting of five IT experts, five domain experts, one system tester, 55 customers, 15 client-side personnel (production managers and staff), and 1 administrative representative of WB Technologies Inc. The system obtained high ratings across several sub-criteria, particularly in accessibility (85.00%), functional completeness (82.00%), and reusability (81.50%), indicating strong system effectiveness, data security, and user-centered design aligned with ISO standards. For quality in use, evaluated by the client representatives of WB Technologies Inc., the system achieved outstanding scores in effectiveness (5/5), efficiency (5/5), and context coverage (5/5), demonstrating strong performance, reliability, and compliance with ISO 25010 standards in real-world operational environments.

---

## Conclusion

The TechTrack Online Monitoring System for WB Technologies Inc. was successfully developed, tested, and validated, meeting system requirements and achieving all core objectives. Evaluation results confirm compliance with ISO 25010 standards, demonstrating strong functionality, efficiency, and data security.

1. **The system design is comprehensive and functionally complete.** Unit and system testing confirmed that all core features—dashboard analytics, product/part management, purchase order creation and tracking, real-time task progress monitoring with percentage-based indicators, report generation, and authentication with role-based access control—operate correctly and consistently across all modules. Functional completeness indicates that the design sufficiently supports all intended operational tasks and user requirements for WB Technologies Inc.

2. **The system was effectively developed using the specified technologies.** Integration testing verified accurate and timely data retrieval and updates from the MySQL database through the Django REST backend, with real-time communication between frontend and backend through the Nginx reverse proxy. Security results, specifically integrity and authentication, confirm protection against unauthorized access and data modification, while performance efficiency scores demonstrate acceptable responsiveness and resource utilization across all three user roles (admin, production manager, customer).

3. **Comprehensive unit, integration, and system testing validated all functionalities.** Report generation, filtering, and data export were confirmed accurate, while user workflows—including order creation, task status updates, real-time progress tracking, and deadline management—operated correctly across all interfaces. Quality-in-use results (perfect scores in effectiveness and efficiency) confirm that the system supports operational tasks accurately and efficiently for both administrative oversight and customer-facing operations.

4. **The system meets ISO 25010 standards for product quality and quality in use.** High ratings across all criteria, particularly accessibility and functional completeness, indicate strong overall quality. Perfect client evaluation scores (5/5) across effectiveness, efficiency, and context coverage confirm usability, satisfaction, and real-world operational performance. The system successfully integrates manufacturing process tracking with customer-facing order management capabilities.

5. **The implementation plan was successfully executed, covering system architecture design, deployment configuration, user orientation, role-based training, and full cloud deployment.** A comprehensive deployment strategy ensures sustained performance through containerization with Docker, automated deployment pipelines, and configuration management. Portability results confirm that the system can be effectively deployed across different cloud environments and server configurations.

**Overall, the system is a functional, reliable, and secure solution that improves order management and real-time tracking processes while meeting WB Technologies Inc. organizational and user requirements.**

---

## Recommendations

To further improve the developed system, the following recommendations are aligned with the study's conclusions and identified areas for enhancement:

1. **Enhance real-time synchronization capabilities and WebSocket integration.** While the system provides real-time percentage-based status updates, incorporating WebSocket technology would enable true bidirectional real-time communication, eliminating polling delays and providing instantaneous updates to customers as production managers update task status. It is recommended to implement WebSocket connections between the frontend and backend to enable live notifications, automatic page updates without manual refresh, and real-time dashboard updates. This enhancement will significantly improve user experience and operational efficiency by reducing information lag between administrative updates and customer notifications.

2. **Implement advanced interoperability through third-party API integration.** The system currently operates as a standalone platform with limited integration capabilities for external enterprise systems. It is recommended to develop RESTful API endpoints that enable integration with WB Technologies Inc.'s existing accounting software, supply chain management systems, and customer relationship management (CRM) platforms. This includes defining standardized data exchange formats, API authentication protocols, and comprehensive technical documentation. Enhancing interoperability will increase system compatibility, reduce manual data entry, and extend operational value across the enterprise.

3. **Extend the system to support supplier and vendor management integration.** Current functionality focuses on internal production tracking and customer order management; however, supplier-side integration for automated inventory replenishment remains manual. It is recommended to develop supplier modules with product catalog management, automated purchase order generation to suppliers based on inventory thresholds, and delivery tracking from suppliers. This enhancement would include real-time inventory synchronization, automated reordering, and integration testing to ensure seamless data exchange between WB Technologies Inc., its suppliers, and customers. This extension will streamline inventory replenishment, reduce stockouts and delays, and optimize the complete supply chain from suppliers through production to customers.

---

**Document Status**: ✅ Complete - Ready for Thesis Submission  
**Last Updated**: May 14, 2026  
**System**: TechTrack v1.0  
**Evaluation Framework**: ISO 25010
