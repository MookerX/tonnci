mysqldump: [Warning] Using a password on the command line interface can be insecure.
-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: tengxi_pms
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `after_sales_record`
--

DROP TABLE IF EXISTS `after_sales_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `after_sales_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `material_id` int DEFAULT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `handle_result` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `after_sales_record`
--

LOCK TABLES `after_sales_record` WRITE;
/*!40000 ALTER TABLE `after_sales_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `after_sales_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bom_item`
--

DROP TABLE IF EXISTS `bom_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bom_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_material_id` int NOT NULL,
  `child_material_id` int NOT NULL,
  `quantity` decimal(10,3) NOT NULL DEFAULT '1.000',
  `loss_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `level_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bom_remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_material_id`),
  KEY `idx_child` (`child_material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bom_item`
--

LOCK TABLES `bom_item` WRITE;
/*!40000 ALTER TABLE `bom_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `bom_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `code_rule`
--

DROP TABLE IF EXISTS `code_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `code_rule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rule_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_format` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `seq_length` int NOT NULL DEFAULT '4',
  `suffix` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'daily',
  `current_seq` int NOT NULL DEFAULT '0',
  `last_reset_date` datetime(3) DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code_rule_rule_code_key` (`rule_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `code_rule`
--

LOCK TABLES `code_rule` WRITE;
/*!40000 ALTER TABLE `code_rule` DISABLE KEYS */;
/*!40000 ALTER TABLE `code_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'enterprise',
  `contact_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `credit_level` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_customer_code_key` (`customer_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_feedback`
--

DROP TABLE IF EXISTS `customer_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `feedback_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reply_content` text COLLATE utf8mb4_unicode_ci,
  `replier_id` int DEFAULT NULL,
  `reply_time` datetime(3) DEFAULT NULL,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_feedback`
--

LOCK TABLES `customer_feedback` WRITE;
/*!40000 ALTER TABLE `customer_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_permission`
--

DROP TABLE IF EXISTS `customer_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `enable_progress_view` tinyint(1) NOT NULL DEFAULT '1',
  `enable_drawing_view` tinyint(1) NOT NULL DEFAULT '0',
  `enable_process_view` tinyint(1) NOT NULL DEFAULT '1',
  `enable_logistics_view` tinyint(1) NOT NULL DEFAULT '1',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_permission`
--

LOCK TABLES `customer_permission` WRITE;
/*!40000 ALTER TABLE `customer_permission` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_reconciliation`
--

DROP TABLE IF EXISTS `customer_reconciliation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_reconciliation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recon_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `unpaid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `invoiced_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `uninvoiced_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_reconciliation_recon_no_key` (`recon_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_reconciliation`
--

LOCK TABLES `customer_reconciliation` WRITE;
/*!40000 ALTER TABLE `customer_reconciliation` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_reconciliation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `database_config`
--

DROP TABLE IF EXISTS `database_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `database_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `host` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `port` int NOT NULL DEFAULT '3306',
  `database` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `database_config_module_code_key` (`module_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `database_config`
--

LOCK TABLES `database_config` WRITE;
/*!40000 ALTER TABLE `database_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `database_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_item`
--

DROP TABLE IF EXISTS `delivery_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `order_id` int NOT NULL,
  `material_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(12,2) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_item`
--

LOCK TABLES `delivery_item` WRITE;
/*!40000 ALTER TABLE `delivery_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_plan`
--

DROP TABLE IF EXISTS `delivery_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_plan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delivery_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int NOT NULL,
  `plan_ship_date` date DEFAULT NULL,
  `ship_date` datetime(3) DEFAULT NULL,
  `delivery_address` text COLLATE utf8mb4_unicode_ci,
  `contact_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `freight_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'self',
  `freight_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `logistics_company` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tracking_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `receive_date` datetime(3) DEFAULT NULL,
  `receive_remark` text COLLATE utf8mb4_unicode_ci,
  `shipped_by` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `delivery_plan_delivery_no_key` (`delivery_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_plan`
--

LOCK TABLES `delivery_plan` WRITE;
/*!40000 ALTER TABLE `delivery_plan` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dept`
--

DROP TABLE IF EXISTS `dept`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dept` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int DEFAULT NULL,
  `dept_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dept_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leader_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dept`
--

LOCK TABLES `dept` WRITE;
/*!40000 ALTER TABLE `dept` DISABLE KEYS */;
INSERT INTO `dept` VALUES (16,NULL,'IT部','IT',NULL,0,'active','系统默认IT部门',0,'2026-04-29 04:02:36.813','2026-04-29 04:02:36.813',0,NULL),(17,NULL,'总经办','ZZB',NULL,0,'active',NULL,0,'2026-04-29 07:10:32.173','2026-04-29 07:10:32.173',13,NULL);
/*!40000 ALTER TABLE `dept` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `file_record`
--

DROP TABLE IF EXISTS `file_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL DEFAULT '0',
  `md5` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storage_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_id` int DEFAULT NULL,
  `uploader_id` int DEFAULT NULL,
  `version` int NOT NULL DEFAULT '1',
  `parent_md5` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `nas_device_id` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_material` (`material_id`),
  KEY `idx_md5` (`md5`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_record`
--

LOCK TABLES `file_record` WRITE;
/*!40000 ALTER TABLE `file_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `file_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` int NOT NULL,
  `warehouse_id` int DEFAULT NULL,
  `total_qty` int NOT NULL DEFAULT '0',
  `available_qty` int NOT NULL DEFAULT '0',
  `locked_qty` int NOT NULL DEFAULT '0',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inventory_material_id_warehouse_id_key` (`material_id`,`warehouse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_lock`
--

DROP TABLE IF EXISTS `inventory_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_lock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `task_id` int DEFAULT NULL,
  `material_id` int NOT NULL,
  `lock_qty` int NOT NULL,
  `used_qty` int NOT NULL DEFAULT '0',
  `released_qty` int NOT NULL DEFAULT '0',
  `lock_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'production',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'locked',
  `expire_date` datetime(3) DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_lock`
--

LOCK TABLES `inventory_lock` WRITE;
/*!40000 ALTER TABLE `inventory_lock` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_lock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_log`
--

DROP TABLE IF EXISTS `inventory_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `task_id` int DEFAULT NULL,
  `change_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changeQty` int NOT NULL,
  `before_qty` int NOT NULL,
  `after_qty` int NOT NULL,
  `lock_id` int DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_material_time` (`material_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_log`
--

LOCK TABLES `inventory_log` WRITE;
/*!40000 ALTER TABLE `inventory_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice`
--

DROP TABLE IF EXISTS `invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recon_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `invoice_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_amount` decimal(12,2) NOT NULL,
  `tax_rate` decimal(5,2) NOT NULL DEFAULT '13.00',
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(12,2) NOT NULL,
  `invoice_date` date NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'issued',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_invoice_no_key` (`invoice_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice`
--

LOCK TABLES `invoice` WRITE;
/*!40000 ALTER TABLE `invoice` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material`
--

DROP TABLE IF EXISTS `material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `internal_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `drawing_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `drawing_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `material_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'part',
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spec` text COLLATE utf8mb4_unicode_ci,
  `weight` decimal(10,3) DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `material_uuid_key` (`uuid`),
  UNIQUE KEY `material_internal_code_key` (`internal_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material`
--

LOCK TABLES `material` WRITE;
/*!40000 ALTER TABLE `material` DISABLE KEYS */;
/*!40000 ALTER TABLE `material` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu`
--

DROP TABLE IF EXISTS `menu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int DEFAULT NULL,
  `menu_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `menu_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `menu_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'menu',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `visible` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'visible',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `permission` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu`
--

LOCK TABLES `menu` WRITE;
/*!40000 ALTER TABLE `menu` DISABLE KEYS */;
INSERT INTO `menu` VALUES (64,NULL,'系统管理',NULL,'directory','Settings','/dashboard/system',30,'visible','active','',NULL,0,'2026-04-29 04:02:36.894','2026-04-29 07:48:15.356',0,13),(65,72,'用户管理',NULL,'menu','LucideUsers','/dashboard/system/user',10,'visible','active','',NULL,0,'2026-04-29 04:02:36.895','2026-04-29 07:48:09.039',0,13),(66,72,'角色管理',NULL,'menu','Group','/dashboard/system/role',30,'visible','active','',NULL,0,'2026-04-29 04:02:36.896','2026-04-29 07:48:09.039',0,13),(67,72,'部门管理',NULL,'menu','LucidePackage','/dashboard/system/dept',20,'visible','active','',NULL,0,'2026-04-29 04:02:36.897','2026-04-29 07:48:09.039',0,13),(68,64,'菜单管理',NULL,'menu','LucideMenu','/dashboard/system/menu',10,'visible','active','',NULL,0,'2026-04-29 04:02:36.898','2026-04-29 07:47:41.448',0,13),(70,69,'日志管理',NULL,'menu','AlignEndVertical','/dashboard/system/log',99,'visible','disabled','',NULL,1,'2026-04-29 04:11:30.355','2026-04-29 04:13:58.025',13,13),(71,83,'质量检验',NULL,'menu','','/dashboard/quality',40,'visible','disabled','',NULL,1,'2026-04-29 04:13:11.860','2026-04-29 06:48:43.808',13,13),(72,NULL,'组织管理',NULL,'directory','LucideGitFork','',20,'visible','active','',NULL,0,'2026-04-29 05:02:47.910','2026-04-29 07:48:15.356',13,13),(74,NULL,'工作台',NULL,'menu','Home','/dashboard',10,'visible','active','',NULL,0,'2026-04-29 05:04:42.767','2026-04-29 07:48:15.356',13,13),(82,NULL,'21231231',NULL,'menu','','',0,'visible','disabled','',NULL,1,'2026-04-29 05:23:37.236','2026-04-29 06:10:38.962',13,13),(83,64,'测试',NULL,'directory','','',0,'visible','disabled','',NULL,1,'2026-04-29 06:14:23.648','2026-04-29 06:48:46.718',13,13),(84,83,'测试',NULL,'menu',NULL,NULL,0,'visible','disabled',NULL,NULL,1,'2026-04-29 06:14:45.736','2026-04-29 06:20:05.149',13,13),(85,64,'操作日志',NULL,'menu','Logs','/dashboard/system/log',20,'visible','active','',NULL,0,'2026-04-29 06:49:16.057','2026-04-29 07:47:41.448',13,13),(86,64,'存储配置',NULL,'menu','LucideDisc3','/dashboard/system/storage',30,'visible','active','',NULL,0,'2026-04-29 06:49:21.396','2026-04-29 07:47:41.448',13,13),(87,64,'参数配置',NULL,'menu','LucideSeparatorHorizontal','/dashboard/system/config',40,'visible','active','',NULL,0,'2026-04-29 06:49:46.946','2026-04-29 07:47:41.448',13,13),(88,64,'数据库配置',NULL,'menu','Database','/dashboard/system/database',50,'visible','active','',NULL,0,'2026-04-29 06:49:52.022','2026-04-29 07:47:41.448',13,13);
/*!40000 ALTER TABLE `menu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nas_device`
--

DROP TABLE IF EXISTS `nas_device`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nas_device` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'synology',
  `host` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `port` int NOT NULL DEFAULT '445',
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `share_path` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `storageTypes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nas_device`
--

LOCK TABLES `nas_device` WRITE;
/*!40000 ALTER TABLE `nas_device` DISABLE KEYS */;
/*!40000 ALTER TABLE `nas_device` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nesting`
--

DROP TABLE IF EXISTS `nesting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nesting` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `nesting_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_id` int NOT NULL,
  `plate_thickness` decimal(10,2) DEFAULT NULL,
  `plate_material` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_length` decimal(10,2) DEFAULT NULL,
  `plate_width` decimal(10,2) DEFAULT NULL,
  `use_qty` int NOT NULL DEFAULT '0',
  `cut_time` int DEFAULT NULL,
  `nesting_file_id` int DEFAULT NULL,
  `operator_id` int DEFAULT NULL,
  `plan_complete_date` date DEFAULT NULL,
  `actual_complete_date` datetime(3) DEFAULT NULL,
  `tail_material` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nesting_nesting_no_key` (`nesting_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nesting`
--

LOCK TABLES `nesting` WRITE;
/*!40000 ALTER TABLE `nesting` DISABLE KEYS */;
/*!40000 ALTER TABLE `nesting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `operation_log`
--

DROP TABLE IF EXISTS `operation_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operation_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator_id` int DEFAULT NULL,
  `operator_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operation_desc` text COLLATE utf8mb4_unicode_ci,
  `request_params` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_module` (`module_name`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=246 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operation_log`
--

LOCK TABLES `operation_log` WRITE;
/*!40000 ALTER TABLE `operation_log` DISABLE KEYS */;
INSERT INTO `operation_log` VALUES (1,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 00:43:28.395'),(2,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:43:48.673'),(3,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:43:53.741'),(4,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:43:59.638'),(5,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:44:06.148'),(6,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:44:13.416'),(7,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:44:17.666'),(8,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":6,\"menuName\":\"菜单管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:44:17.707'),(9,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:44:26.848'),(10,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":7,\"menuName\":\"用户管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:44:26.883'),(11,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":8,\"menuName\":\"角色管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:44:26.934'),(12,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":9,\"menuName\":\"部门管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:44:26.968'),(13,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":10,\"menuName\":\"生产管理\",\"menuType\":\"directory\"}','::1','success',NULL,0,'2026-04-29 00:44:26.999'),(14,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:44:34.696'),(15,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:45:08.084'),(16,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:45:14.380'),(17,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:45:28.739'),(18,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":11,\"menuName\":\"菜单管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:45:28.780'),(19,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":12,\"menuName\":\"用户管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:45:28.819'),(20,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":13,\"menuName\":\"角色管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:45:28.856'),(21,'菜单权限','create',1,'admin','创建菜单权限','{\"id\":14,\"menuName\":\"部门管理\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 00:45:28.895'),(22,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:46:17.876'),(23,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:47:03.011'),(24,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:47:37.941'),(25,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:48:42.468'),(26,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:48:59.432'),(27,'认证模块','登录',1,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 00:49:38.100'),(28,'认证模块','登录',2,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:51:19.098'),(29,'用户管理','create',2,'zengxl','创建用户管理','{\"username\":\"dengq\",\"realName\":\"邓强\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:54:19.158'),(30,'角色管理','create',2,'zengxl','创建角色管理','{\"roleId\":3,\"roleName\":\"人资\",\"roleCode\":\"HR\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:54:54.256'),(31,'角色管理','分配权限',2,'zengxl',NULL,'{\"roleId\":3,\"permissions\":16,\"deptIds\":0,\"dataScope\":\"all\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:55:17.088'),(32,'部门管理','create',2,'zengxl','创建部门管理','{\"id\":3,\"deptName\":\"总经办\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:55:54.505'),(33,'部门管理','create',2,'zengxl','创建部门管理','{\"id\":4,\"deptName\":\"制造部\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:56:24.691'),(34,'部门管理','create',2,'zengxl','创建部门管理','{\"id\":5,\"deptName\":\"下料班\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:57:07.132'),(35,'部门管理','create',2,'zengxl','创建部门管理','{\"id\":6,\"deptName\":\"机加班\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:57:19.295'),(36,'部门管理','create',2,'zengxl','创建部门管理','{\"id\":7,\"deptName\":\"财务部\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:57:41.468'),(37,'部门管理','create',2,'zengxl','创建部门管理','{\"id\":8,\"deptName\":\"XLB\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:57:49.736'),(38,'部门管理','delete',2,'zengxl','删除部门管理','{\"id\":8,\"deptName\":\"XLB\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:57:57.215'),(39,'部门管理','update',2,'zengxl','更新部门管理','{\"id\":5,\"deptName\":\"下料班\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:58:04.636'),(40,'部门管理','update',2,'zengxl','更新部门管理','{\"id\":6,\"deptName\":\"机加班\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:58:12.930'),(41,'用户管理','update',2,'zengxl','更新用户管理','{\"id\":2,\"username\":\"zengxl\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 00:58:50.945'),(42,'认证模块','登录',3,'dengq','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:01:19.131'),(43,'认证模块','登录',2,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:01:37.615'),(44,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 01:06:16.717'),(45,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 01:06:21.681'),(46,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 01:08:08.533'),(47,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 01:08:11.089'),(48,'认证模块','登录',4,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 01:08:28.765'),(49,'认证模块','登录',4,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 01:10:21.452'),(50,'认证模块','登录',4,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 01:10:26.927'),(51,'认证模块','登录',4,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 01:11:07.918'),(52,'菜单权限','create',4,'admin','创建菜单权限','{\"id\":25,\"menuName\":\"生产订单\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 01:11:07.978'),(53,'认证模块','登录',4,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 01:11:12.837'),(54,'认证模块','登录',4,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 01:12:10.318'),(55,'认证模块','登录',5,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:20:20.794'),(56,'菜单权限','create',5,'zengxl','创建菜单权限','{\"id\":31,\"menuName\":\"存储配置\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:21:15.063'),(57,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":26,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:22:24.733'),(58,'菜单权限','create',5,'zengxl','创建菜单权限','{\"id\":32,\"menuName\":\"测试\",\"menuType\":\"button\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:23:49.551'),(59,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":31,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:57:45.531'),(60,'菜单权限','delete',5,'zengxl','删除菜单权限','{\"id\":32,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:57:54.862'),(61,'用户管理','create',5,'zengxl','创建用户管理','{\"username\":\"dengq\",\"realName\":null}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 01:58:16.027'),(62,'认证模块','登录',5,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:16:40.032'),(63,'菜单权限','create',5,'zengxl','创建菜单权限','{\"id\":33,\"menuName\":\"dashboard\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:17:35.170'),(64,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":33,\"menuName\":\"dashboard\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:18:42.699'),(65,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":26,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:20:16.427'),(66,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":26,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:21:01.182'),(67,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":33,\"menuName\":\"工作台\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:21:18.537'),(68,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":26,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:21:24.667'),(69,'菜单权限','update',5,'zengxl','更新菜单权限','{\"id\":31,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:23:57.573'),(70,'认证模块','登录',5,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:29:09.945'),(71,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 02:30:27.661'),(72,'认证模块','登录',7,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 02:30:37.402'),(73,'菜单权限','create',7,'admin','创建菜单权限','{\"id\":39,\"menuName\":\"测试菜单\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 02:30:37.458'),(74,'认证模块','登录',7,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 02:30:43.335'),(75,'菜单权限','update',7,'admin','更新菜单权限','{\"id\":39,\"menuName\":\"测试菜单\"}','::1','success',NULL,0,'2026-04-29 02:30:43.496'),(76,'认证模块','登录',8,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:35:54.546'),(77,'认证模块','登录',8,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:36:06.774'),(78,'菜单权限','create',8,'zengxl','创建菜单权限','{\"id\":45,\"menuName\":\"存储配置\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:36:42.847'),(79,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":45,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:36:55.856'),(80,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":45,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:37:33.062'),(81,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":45,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:37:56.446'),(82,'菜单权限','create',8,'zengxl','创建菜单权限','{\"id\":46,\"menuName\":\"dashboard\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:38:08.135'),(83,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":46,\"menuName\":\"dashboard\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:38:29.578'),(84,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":46,\"menuName\":\"工作台二\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:40:28.462'),(85,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":46,\"menuName\":\"工作台\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:40:41.596'),(86,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":45,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:40:49.682'),(87,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":40,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:41:04.789'),(88,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":41,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:41:43.993'),(89,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":41,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:42:06.571'),(90,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":41,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:42:19.826'),(91,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":45,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:42:37.671'),(92,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":45,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:43:03.619'),(93,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":45,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:43:29.196'),(94,'菜单权限','update',8,'zengxl','更新菜单权限','{\"id\":41,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 02:43:44.837'),(95,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 02:49:11.905'),(96,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 02:49:15.370'),(97,'认证模块','登录',9,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 02:49:23.505'),(98,'认证模块','登录',9,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 02:49:30.877'),(99,'认证模块','登录',9,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 02:49:35.742'),(100,'认证模块','登录',11,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:54:16.862'),(101,'认证模块','登录',11,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:55:12.466'),(102,'菜单权限','create',11,'zengxl','创建菜单权限','{\"id\":62,\"menuName\":\"dashboard\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:56:22.737'),(103,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":62,\"menuName\":\"dashboard\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:56:33.369'),(104,'菜单权限','create',11,'zengxl','创建菜单权限','{\"id\":63,\"menuName\":\"存储配置\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:56:47.337'),(105,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":63,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:57:02.649'),(106,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":62,\"menuName\":\"工作台\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:57:36.410'),(107,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":57,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:57:49.779'),(108,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":58,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:58:01.735'),(109,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":63,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:58:33.377'),(110,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":58,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 03:58:56.874'),(111,'菜单权限','update',11,'zengxl','更新菜单权限','{\"id\":58,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:00:19.372'),(112,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 04:02:30.830'),(113,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (admin)',NULL,'::1','fail',NULL,0,'2026-04-29 04:02:33.501'),(114,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 04:02:42.221'),(115,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 04:05:12.749'),(116,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (zengxl)',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','fail',NULL,0,'2026-04-29 04:06:16.136'),(117,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (dengq)',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','fail',NULL,0,'2026-04-29 04:06:19.560'),(118,'认证模块','登录',13,'admin','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:06:47.884'),(119,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":65,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:07:41.439'),(120,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":69,\"menuName\":\"测试\",\"menuType\":\"directory\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:11:00.276'),(121,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":70,\"menuName\":\"日志管理\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:11:30.359'),(122,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":70,\"menuName\":\"日志管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:11:41.269'),(123,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":70,\"menuName\":\"日志管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:11:53.898'),(124,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":70,\"menuName\":\"日志管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:12:22.685'),(125,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":71,\"menuName\":\"质量检验\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:13:11.863'),(126,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":71,\"menuName\":\"质量检验\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:13:21.573'),(127,'菜单权限','delete',13,'admin','删除菜单权限','{\"id\":70,\"menuName\":\"日志管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:13:58.033'),(128,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":71,\"menuName\":\"质量检验\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:14:28.487'),(129,'菜单权限','delete',13,'admin','删除菜单权限','{\"id\":69,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:14:32.992'),(130,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":66,\"menuName\":\"角色管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:16:34.894'),(131,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":66,\"menuName\":\"角色管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:17:00.404'),(132,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":65,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:22:16.091'),(133,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":67,\"menuName\":\"部门管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:22:21.073'),(134,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:22:26.544'),(135,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:22:27.843'),(136,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:22:29.605'),(137,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":66,\"menuName\":\"角色管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:22:34.976'),(138,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":65,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:22:38.747'),(139,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 04:25:39.374'),(140,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (zengxl)',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','fail',NULL,0,'2026-04-29 04:28:37.223'),(141,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (zengxl)',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','fail',NULL,0,'2026-04-29 04:28:40.699'),(142,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (zengxl)',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','fail',NULL,0,'2026-04-29 04:29:35.528'),(143,'认证模块','登录',NULL,NULL,'登录失败: 用户不存在 (zengxl)',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','fail',NULL,0,'2026-04-29 04:29:43.148'),(144,'认证模块','登录',13,'admin','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:29:46.905'),(145,'认证模块','登录',13,'admin','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:31:01.653'),(146,'认证模块','登录',13,'admin','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:36:18.659'),(147,'认证模块','登录',13,'admin','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 04:59:46.314'),(148,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":72,\"menuName\":\"组织管理\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:02:47.914'),(149,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:02:57.541'),(150,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:03:07.601'),(151,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:03:23.129'),(152,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:03:29.704'),(153,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":73,\"menuName\":\"测试\",\"menuType\":\"directory\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:03:53.767'),(154,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:04:01.017'),(155,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":73,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:04:10.051'),(156,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":74,\"menuName\":\"dashboard\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:04:42.770'),(157,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":74,\"menuName\":\"dashboard\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:04:55.293'),(158,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":74,\"menuName\":\"工作台\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:05:39.182'),(159,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":74,\"menuName\":\"工作台\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:08:07.541'),(160,'认证模块','登录',13,'admin','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:16:37.790'),(161,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:18:59.330'),(162,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:19:23.196'),(163,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":81,\"menuName\":\"测试菜单3\",\"menuType\":\"menu\"}','::1','success',NULL,0,'2026-04-29 05:19:23.254'),(164,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:20:29.026'),(165,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:20:37.559'),(166,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":74,\"menuName\":\"工作台\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:20:45.384'),(167,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:21:25.423'),(168,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":82,\"menuName\":\"21231231\",\"menuType\":\"directory\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:23:37.239'),(169,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":82,\"menuName\":\"21231231\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 05:23:42.915'),(170,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:26:02.063'),(171,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','::1','success',NULL,0,'2026-04-29 05:26:02.944'),(172,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:26:29.269'),(173,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','::1','success',NULL,0,'2026-04-29 05:26:29.404'),(174,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:49:42.817'),(175,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','::1','success',NULL,0,'2026-04-29 05:49:43.898'),(176,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:54:04.779'),(177,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','::1','success',NULL,0,'2026-04-29 05:54:05.844'),(178,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:54:33.630'),(179,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','::1','success',NULL,0,'2026-04-29 05:54:33.869'),(180,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:56:46.192'),(181,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','::1','success',NULL,0,'2026-04-29 05:56:46.345'),(182,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:57:24.493'),(183,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"测试\"}','::1','success',NULL,0,'2026-04-29 05:57:24.606'),(184,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:58:16.415'),(185,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"测试\"}','::1','success',NULL,0,'2026-04-29 05:58:16.536'),(186,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 05:59:32.654'),(187,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 06:00:19.752'),(188,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"测试\"}','::1','success',NULL,0,'2026-04-29 06:00:20.015'),(189,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 06:02:00.892'),(190,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"测试\"}','::1','success',NULL,0,'2026-04-29 06:02:01.138'),(191,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:10:02.226'),(192,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":82,\"menuName\":\"21231231\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:10:33.383'),(193,'菜单权限','delete',13,'admin','删除菜单权限','{\"id\":82,\"menuName\":\"21231231\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:10:38.977'),(194,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":72,\"menuName\":\"组织管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:10:47.190'),(195,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:11:23.952'),(196,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":68,\"menuName\":\"菜单管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:11:43.791'),(197,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":66,\"menuName\":\"角色管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:12:06.533'),(198,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":67,\"menuName\":\"部门管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:13:06.925'),(199,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":65,\"menuName\":\"用户管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:13:14.497'),(200,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":71,\"menuName\":\"质量检验\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:14:07.492'),(201,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":83,\"menuName\":\"测试\",\"menuType\":\"directory\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:14:23.651'),(202,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":84,\"menuName\":\"测试\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:14:45.739'),(203,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 06:17:47.373'),(204,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":71,\"menuName\":\"质量检验\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:19:59.014'),(205,'菜单权限','delete',13,'admin','删除菜单权限','{\"id\":84,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:20:05.154'),(206,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 06:27:27.002'),(207,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 06:28:05.825'),(208,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":83,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:29:19.430'),(209,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":83,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:29:48.095'),(210,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 06:36:38.236'),(211,'菜单权限','delete',13,'admin','删除菜单权限','{\"id\":71,\"menuName\":\"质量检验\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:48:43.822'),(212,'菜单权限','delete',13,'admin','删除菜单权限','{\"id\":83,\"menuName\":\"测试\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:48:46.729'),(213,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":85,\"menuName\":\"日志管理\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:49:16.060'),(214,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":86,\"menuName\":\"存储配置\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:49:21.399'),(215,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":87,\"menuName\":\"参数配置\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:49:46.948'),(216,'菜单权限','create',13,'admin','创建菜单权限','{\"id\":88,\"menuName\":\"数据库\",\"menuType\":\"menu\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:49:52.025'),(217,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":87,\"menuName\":\"参数配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:50:16.613'),(218,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":88,\"menuName\":\"数据库\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:50:23.229'),(219,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":86,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:50:40.754'),(220,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":85,\"menuName\":\"日志管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:51:17.767'),(221,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":88,\"menuName\":\"数据库\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:52:03.729'),(222,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":85,\"menuName\":\"日志管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:52:57.735'),(223,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":86,\"menuName\":\"存储配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:54:16.196'),(224,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":87,\"menuName\":\"参数配置\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 06:56:42.733'),(225,'认证模块','登录',13,'admin','用户登录成功',NULL,'::1','success',NULL,0,'2026-04-29 06:59:31.226'),(226,'认证模块','登录',13,'admin','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:08:50.142'),(227,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":64,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:09:27.100'),(228,'菜单权限','update',13,'admin','更新菜单权限','{\"id\":64,\"menuName\":\"系统管理\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:09:33.397'),(229,'用户管理','create',13,'admin','创建用户管理','{\"username\":\"zengxl\",\"realName\":\"曾祥亮\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:10:07.383'),(230,'部门管理','create',13,'admin','创建部门管理','{\"id\":17,\"deptName\":\"总经办\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:10:32.177'),(231,'角色管理','create',13,'admin','创建角色管理','{\"roleId\":12,\"roleName\":\"人资\",\"roleCode\":\"HR\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:10:53.336'),(232,'用户管理','create',13,'admin','创建用户管理','{\"username\":\"dengq\",\"realName\":null}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:11:12.776'),(233,'角色管理','分配权限',13,'admin',NULL,'{\"roleId\":12,\"permissions\":12,\"deptIds\":0,\"dataScope\":\"dept\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:11:38.374'),(234,'认证模块','登录',15,'dengq','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:11:44.820'),(235,'认证模块','登录',14,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:25:32.322'),(236,'角色管理','分配权限',14,'zengxl',NULL,'{\"roleId\":12,\"permissions\":12,\"deptIds\":0,\"dataScope\":\"dept\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:25:48.900'),(237,'用户管理','update',14,'zengxl','更新用户管理','{\"id\":15,\"username\":\"dengq\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:26:11.600'),(238,'认证模块','登录',15,'dengq','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:26:19.491'),(239,'认证模块','登录',14,'zengxl','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:26:36.769'),(240,'角色管理','分配权限',14,'zengxl',NULL,'{\"roleId\":12,\"permissions\":16,\"deptIds\":0,\"dataScope\":\"dept\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:27:31.299'),(241,'认证模块','登录',15,'dengq','用户登录成功',NULL,'240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:27:40.156'),(242,'认证模块','登录',15,'dengq','登录失败: 密码错误',NULL,'::1','fail',NULL,0,'2026-04-29 07:29:08.461'),(243,'角色管理','分配权限',15,'dengq',NULL,'{\"roleId\":12,\"permissions\":13,\"deptIds\":0,\"dataScope\":\"dept\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:31:42.268'),(244,'角色管理','分配权限',15,'dengq',NULL,'{\"roleId\":12,\"permissions\":12,\"deptIds\":0,\"dataScope\":\"dept\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:32:17.875'),(245,'角色管理','分配权限',15,'dengq',NULL,'{\"roleId\":12,\"permissions\":16,\"deptIds\":0,\"dataScope\":\"dept\"}','240e:382:515:fd00:1954:1fcd:af93:8796','success',NULL,0,'2026-04-29 07:37:04.263');
/*!40000 ALTER TABLE `operation_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_record`
--

DROP TABLE IF EXISTS `payment_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recon_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `payment_amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_account` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'confirmed',
  `confirmed_by` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_record`
--

LOCK TABLES `payment_record` WRITE;
/*!40000 ALTER TABLE `payment_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process`
--

DROP TABLE IF EXISTS `process`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process` (
  `id` int NOT NULL AUTO_INCREMENT,
  `process_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `process_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `process_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `team_id` int DEFAULT NULL,
  `equipment_required` tinyint(1) NOT NULL DEFAULT '0',
  `standard_hours` decimal(10,2) DEFAULT NULL,
  `preparation_hours` decimal(10,2) DEFAULT NULL,
  `quality_points` int NOT NULL DEFAULT '1',
  `process_order` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `process_process_code_key` (`process_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process`
--

LOCK TABLES `process` WRITE;
/*!40000 ALTER TABLE `process` DISABLE KEYS */;
/*!40000 ALTER TABLE `process` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `process_route`
--

DROP TABLE IF EXISTS `process_route`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `process_route` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_id` int NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `process_route`
--

LOCK TABLES `process_route` WRITE;
/*!40000 ALTER TABLE `process_route` DISABLE KEYS */;
/*!40000 ALTER TABLE `process_route` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_order`
--

DROP TABLE IF EXISTS `production_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_order` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` int NOT NULL,
  `material_id` int NOT NULL,
  `quantity` int NOT NULL,
  `delivered_qty` int NOT NULL DEFAULT '0',
  `unit_price` decimal(12,2) DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `nesting_plan_date` datetime(3) DEFAULT NULL,
  `material_plan_date` datetime(3) DEFAULT NULL,
  `purchase_plan_date` datetime(3) DEFAULT NULL,
  `production_plan_date` datetime(3) DEFAULT NULL,
  `nesting_actual_date` datetime(3) DEFAULT NULL,
  `material_actual_date` datetime(3) DEFAULT NULL,
  `purchase_actual_date` datetime(3) DEFAULT NULL,
  `production_actual_date` datetime(3) DEFAULT NULL,
  `delivery_address` text COLLATE utf8mb4_unicode_ci,
  `freight_bear` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipment_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipment_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `surface_treatment` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reconciliation_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unreconciled',
  `snapshot_data` text COLLATE utf8mb4_unicode_ci,
  `progress_log` text COLLATE utf8mb4_unicode_ci,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `production_order_uuid_key` (`uuid`),
  UNIQUE KEY `production_order_order_no_key` (`order_no`),
  KEY `idx_order_customer` (`customer_id`),
  KEY `idx_order_status` (`order_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_order`
--

LOCK TABLES `production_order` WRITE;
/*!40000 ALTER TABLE `production_order` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_task`
--

DROP TABLE IF EXISTS `production_task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_task` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` int NOT NULL,
  `material_id` int NOT NULL,
  `task_quantity` int NOT NULL,
  `produced_qty` int NOT NULL DEFAULT '0',
  `nesting_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `material_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `purchase_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `task_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `production_start_date` datetime(3) DEFAULT NULL,
  `production_end_date` datetime(3) DEFAULT NULL,
  `qr_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `production_task_task_no_key` (`task_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_task`
--

LOCK TABLES `production_task` WRITE;
/*!40000 ALTER TABLE `production_task` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_invoice`
--

DROP TABLE IF EXISTS `purchase_invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_invoice` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` int NOT NULL,
  `order_id` int DEFAULT NULL,
  `invoice_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_amount` decimal(12,2) NOT NULL,
  `tax_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `invoice_date` date DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_invoice_invoice_no_key` (`invoice_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_invoice`
--

LOCK TABLES `purchase_invoice` WRITE;
/*!40000 ALTER TABLE `purchase_invoice` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_invoice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order`
--

DROP TABLE IF EXISTS `purchase_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` int NOT NULL,
  `order_date` date DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `received_qty` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `approval_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_order_purchase_no_key` (`purchase_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order`
--

LOCK TABLES `purchase_order` WRITE;
/*!40000 ALTER TABLE `purchase_order` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_item`
--

DROP TABLE IF EXISTS `purchase_order_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `material_id` int NOT NULL,
  `order_qty` int NOT NULL,
  `received_qty` int NOT NULL DEFAULT '0',
  `unit_price` decimal(12,2) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_item`
--

LOCK TABLES `purchase_order_item` WRITE;
/*!40000 ALTER TABLE `purchase_order_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_receive`
--

DROP TABLE IF EXISTS `purchase_receive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_receive` (
  `id` int NOT NULL AUTO_INCREMENT,
  `receive_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` int DEFAULT NULL,
  `supplier_id` int NOT NULL,
  `receive_date` date NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `quality_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_receive_receive_no_key` (`receive_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_receive`
--

LOCK TABLES `purchase_receive` WRITE;
/*!40000 ALTER TABLE `purchase_receive` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_receive` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_requirement`
--

DROP TABLE IF EXISTS `purchase_requirement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_requirement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `requirement_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `material_id` int NOT NULL,
  `requirement_qty` int NOT NULL,
  `unit_price` decimal(12,2) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT NULL,
  `required_date` date DEFAULT NULL,
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `source_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'auto',
  `source_order_id` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_requirement_requirement_no_key` (`requirement_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_requirement`
--

LOCK TABLES `purchase_requirement` WRITE;
/*!40000 ALTER TABLE `purchase_requirement` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_requirement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qc_record`
--

DROP TABLE IF EXISTS `qc_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qc_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `process_id` int NOT NULL,
  `report_id` int DEFAULT NULL,
  `qc_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inspected_qty` int NOT NULL,
  `qualified_qty` int NOT NULL,
  `unqualified_qty` int NOT NULL,
  `unqualified_reason` text COLLATE utf8mb4_unicode_ci,
  `handling_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inspector_id` int NOT NULL,
  `inspection_date` date NOT NULL,
  `photos` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'passed',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qc_record`
--

LOCK TABLES `qc_record` WRITE;
/*!40000 ALTER TABLE `qc_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `qc_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reconciliation_item`
--

DROP TABLE IF EXISTS `reconciliation_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reconciliation_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recon_id` int NOT NULL,
  `order_id` int NOT NULL,
  `order_no` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_order_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unpaid',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reconciliation_item`
--

LOCK TABLES `reconciliation_item` WRITE;
/*!40000 ALTER TABLE `reconciliation_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `reconciliation_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rework_plan`
--

DROP TABLE IF EXISTS `rework_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rework_plan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `process_id` int NOT NULL,
  `original_qty` int NOT NULL,
  `rework_qty` int NOT NULL,
  `completed_qty` int NOT NULL DEFAULT '0',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completed_at` datetime(3) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rework_plan`
--

LOCK TABLES `rework_plan` WRITE;
/*!40000 ALTER TABLE `rework_plan` DISABLE KEYS */;
/*!40000 ALTER TABLE `rework_plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_scope` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'custom',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `sort_order` int NOT NULL DEFAULT '0',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_role_code_key` (`role_code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES (11,'超级管理员','super_admin','all','active',1,'系统内置超级管理员角色，拥有全部权限',0,'2026-04-29 04:02:36.810','2026-04-29 04:02:36.810',0,NULL),(12,'人资','HR','dept','active',0,NULL,0,'2026-04-29 07:10:53.333','2026-04-29 07:37:04.242',13,NULL);
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_dept_scope`
--

DROP TABLE IF EXISTS `role_dept_scope`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_dept_scope` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `dept_id` int NOT NULL,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_dept_scope_role_id_dept_id_key` (`role_id`,`dept_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_dept_scope`
--

LOCK TABLES `role_dept_scope` WRITE;
/*!40000 ALTER TABLE `role_dept_scope` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_dept_scope` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permission`
--

DROP TABLE IF EXISTS `role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `menu_id` int DEFAULT NULL,
  `permission` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permission_role_id_menu_id_permission_key` (`role_id`,`menu_id`,`permission`)
) ENGINE=InnoDB AUTO_INCREMENT=98 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permission`
--

LOCK TABLES `role_permission` WRITE;
/*!40000 ALTER TABLE `role_permission` DISABLE KEYS */;
INSERT INTO `role_permission` VALUES (82,12,NULL,'system:user:query',NULL,0,'2026-04-29 07:37:04.000'),(83,12,NULL,'system:user:create',NULL,0,'2026-04-29 07:37:04.000'),(84,12,NULL,'system:user:update',NULL,0,'2026-04-29 07:37:04.000'),(85,12,NULL,'system:user:delete',NULL,0,'2026-04-29 07:37:04.000'),(86,12,NULL,'system:role:query',NULL,0,'2026-04-29 07:37:04.000'),(87,12,NULL,'system:role:create',NULL,0,'2026-04-29 07:37:04.000'),(88,12,NULL,'system:role:update',NULL,0,'2026-04-29 07:37:04.000'),(89,12,NULL,'system:role:delete',NULL,0,'2026-04-29 07:37:04.000'),(90,12,NULL,'system:dept:query',NULL,0,'2026-04-29 07:37:04.000'),(91,12,NULL,'system:dept:create',NULL,0,'2026-04-29 07:37:04.000'),(92,12,NULL,'system:dept:update',NULL,0,'2026-04-29 07:37:04.000'),(93,12,NULL,'system:dept:delete',NULL,0,'2026-04-29 07:37:04.000'),(94,12,NULL,'system:menu:query',NULL,0,'2026-04-29 07:37:04.000'),(95,12,NULL,'system:menu:create',NULL,0,'2026-04-29 07:37:04.000'),(96,12,NULL,'system:menu:update',NULL,0,'2026-04-29 07:37:04.000'),(97,12,NULL,'system:menu:delete',NULL,0,'2026-04-29 07:37:04.000');
/*!40000 ALTER TABLE `role_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `route_process`
--

DROP TABLE IF EXISTS `route_process`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `route_process` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_id` int NOT NULL,
  `process_id` int NOT NULL,
  `process_order` int NOT NULL,
  `standard_hours` decimal(10,2) DEFAULT NULL,
  `preparation_hours` decimal(10,2) DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_process_route_id_process_id_key` (`route_id`,`process_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `route_process`
--

LOCK TABLES `route_process` WRITE;
/*!40000 ALTER TABLE `route_process` DISABLE KEYS */;
/*!40000 ALTER TABLE `route_process` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `storage_config`
--

DROP TABLE IF EXISTS `storage_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `storage_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `storage_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nas_device_id` int DEFAULT NULL,
  `oss_endpoint` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oss_bucket` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oss_access_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oss_secret_key` text COLLATE utf8mb4_unicode_ci,
  `file_types` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `max_file_size` int NOT NULL DEFAULT '10485760',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `storage_config`
--

LOCK TABLES `storage_config` WRITE;
/*!40000 ALTER TABLE `storage_config` DISABLE KEYS */;
INSERT INTO `storage_config` VALUES (1,'系统图片存储','local','/workspace/projects/storage/images',NULL,NULL,NULL,NULL,NULL,'.png,.gif,.jpg,.jpeg,.webp,.avif,.svg',10485760,1,'active','系统默认图片存储，绑定常用图片格式',0,'2026-04-29 00:43:44.607','2026-04-29 00:43:44.607',0,NULL);
/*!40000 ALTER TABLE `storage_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier`
--

DROP TABLE IF EXISTS `supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier` (
  `id` int NOT NULL AUTO_INCREMENT,
  `supplier_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `supply_types` text COLLATE utf8mb4_unicode_ci,
  `rating` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_supplier_code_key` (`supplier_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier`
--

LOCK TABLES `supplier` WRITE;
/*!40000 ALTER TABLE `supplier` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_config`
--

DROP TABLE IF EXISTS `system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paramKey` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `paramValue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `paramType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_config_paramKey_key` (`paramKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_config`
--

LOCK TABLES `system_config` WRITE;
/*!40000 ALTER TABLE `system_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_dict`
--

DROP TABLE IF EXISTS `system_dict`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_dict` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dictType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dictLabel` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dictValue` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dict_type` (`dictType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_dict`
--

LOCK TABLES `system_dict` WRITE;
/*!40000 ALTER TABLE `system_dict` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_dict` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_init_status`
--

DROP TABLE IF EXISTS `system_init_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_init_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `init_step` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `step_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `completed_at` datetime(3) DEFAULT NULL,
  `config_data` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_init_status`
--

LOCK TABLES `system_init_status` WRITE;
/*!40000 ALTER TABLE `system_init_status` DISABLE KEYS */;
INSERT INTO `system_init_status` VALUES (1,'completed','completed','2026-04-29 04:02:36.898','{\"database\":{\"host\":\"127.0.0.1\",\"port\":3306,\"username\":\"root\",\"password\":\"password123\",\"database\":\"tengxi_pms\"}}',0,'2026-04-29 00:43:44.614','2026-04-29 04:02:36.899');
/*!40000 ALTER TABLE `system_init_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_process`
--

DROP TABLE IF EXISTS `task_process`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_process` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `process_id` int NOT NULL,
  `process_order` int NOT NULL,
  `plan_start_date` date DEFAULT NULL,
  `plan_end_date` date DEFAULT NULL,
  `actual_start_date` datetime(3) DEFAULT NULL,
  `actual_end_date` datetime(3) DEFAULT NULL,
  `worker_id` int DEFAULT NULL,
  `standard_hours` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_process_task_id_process_id_key` (`task_id`,`process_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_process`
--

LOCK TABLES `task_process` WRITE;
/*!40000 ALTER TABLE `task_process` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_process` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team`
--

DROP TABLE IF EXISTS `team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team` (
  `id` int NOT NULL AUTO_INCREMENT,
  `team_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `leader_id` int DEFAULT NULL,
  `team_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'processing',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_team_code_key` (`team_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team`
--

LOCK TABLES `team` WRITE;
/*!40000 ALTER TABLE `team` DISABLE KEYS */;
/*!40000 ALTER TABLE `team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tech_bom_item`
--

DROP TABLE IF EXISTS `tech_bom_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tech_bom_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `material_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `quantity` decimal(10,3) NOT NULL DEFAULT '1.000',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tech_bom_item`
--

LOCK TABLES `tech_bom_item` WRITE;
/*!40000 ALTER TABLE `tech_bom_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `tech_bom_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tech_task`
--

DROP TABLE IF EXISTS `tech_task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tech_task` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `assignee_id` int DEFAULT NULL,
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `due_date` date DEFAULT NULL,
  `bom_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `drawing_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `process_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `attachment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tech_task`
--

LOCK TABLES `tech_task` WRITE;
/*!40000 ALTER TABLE `tech_task` DISABLE KEYS */;
/*!40000 ALTER TABLE `tech_task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tech_task_transfer`
--

DROP TABLE IF EXISTS `tech_task_transfer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tech_task_transfer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `transfer_reason` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tech_task_transfer`
--

LOCK TABLES `tech_task_transfer` WRITE;
/*!40000 ALTER TABLE `tech_task_transfer` DISABLE KEYS */;
/*!40000 ALTER TABLE `tech_task_transfer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `real_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_id` int DEFAULT NULL,
  `user_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal',
  `customer_id` int DEFAULT NULL,
  `role_ids` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `last_login_at` datetime(3) DEFAULT NULL,
  `login_ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_uuid_key` (`uuid`),
  UNIQUE KEY `user_username_key` (`username`),
  KEY `idx_dept` (`dept_id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `user_dept_id_fkey` FOREIGN KEY (`dept_id`) REFERENCES `dept` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (13,'793df374-473b-45d4-8efa-e41d2e5b4fd3','admin','$2b$10$nu.DqN3XvMCy6NclFQtlxujRqORQikQeVzWsqugyolL2QOtCZOXRS','管理员',NULL,NULL,NULL,16,'internal',NULL,'[11]','active','2026-04-29 07:08:50.136','240e:382:515:fd00:1954:1fcd:af93:8796',NULL,0,'2026-04-29 04:02:36.891','2026-04-29 07:08:50.137',0,NULL),(14,'0ee326ec-1df8-467d-8b7c-bdbc2c22745c','zengxl','$2b$10$lie8aYtym1Zk3xLGPQonPOjMjkloCxGT03AHeV4XtcnljLiSTnuuG','曾祥亮',NULL,NULL,NULL,16,'internal',NULL,'[11]','active','2026-04-29 07:26:36.764','240e:382:515:fd00:1954:1fcd:af93:8796',NULL,0,'2026-04-29 07:10:07.379','2026-04-29 07:26:36.765',13,NULL),(15,'888e6100-7956-49ee-b068-90f5a51c1051','dengq','$2b$10$RY41quAJ8N00CyaYb/Fhs.0xQM1/NOzI4l77ZA0oKduzGLnoYKmVq','邓强',NULL,NULL,NULL,17,'internal',NULL,'[12]','active','2026-04-29 07:27:40.152','240e:382:515:fd00:1954:1fcd:af93:8796',NULL,0,'2026-04-29 07:11:12.773','2026-04-29 07:27:40.153',13,14);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_role`
--

DROP TABLE IF EXISTS `user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_role_user_id_role_id_key` (`user_id`,`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_role`
--

LOCK TABLES `user_role` WRITE;
/*!40000 ALTER TABLE `user_role` DISABLE KEYS */;
INSERT INTO `user_role` VALUES (11,13,11,0,'2026-04-29 04:02:36.892');
/*!40000 ALTER TABLE `user_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wage_payment_record`
--

DROP TABLE IF EXISTS `wage_payment_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wage_payment_record` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settlement_id` int NOT NULL,
  `worker_id` int NOT NULL,
  `gross_amount` decimal(12,2) NOT NULL,
  `social_security` decimal(12,2) NOT NULL DEFAULT '0.00',
  `housing_fund` decimal(12,2) NOT NULL DEFAULT '0.00',
  `personal_tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(12,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paid',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wage_payment_record`
--

LOCK TABLES `wage_payment_record` WRITE;
/*!40000 ALTER TABLE `wage_payment_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `wage_payment_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wage_settlement`
--

DROP TABLE IF EXISTS `wage_settlement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wage_settlement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settle_month` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `worker_count` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `payment_date` datetime(3) DEFAULT NULL,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_account` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wage_settlement_settle_month_key` (`settle_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wage_settlement`
--

LOCK TABLES `wage_settlement` WRITE;
/*!40000 ALTER TABLE `wage_settlement` DISABLE KEYS */;
/*!40000 ALTER TABLE `wage_settlement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wage_settlement_item`
--

DROP TABLE IF EXISTS `wage_settlement_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wage_settlement_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `settlement_id` int NOT NULL,
  `worker_id` int NOT NULL,
  `piece_work_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `time_work_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `overtime_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `allowance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deduction` decimal(12,2) NOT NULL DEFAULT '0.00',
  `social_security` decimal(12,2) NOT NULL DEFAULT '0.00',
  `housing_fund` decimal(12,2) NOT NULL DEFAULT '0.00',
  `personal_tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gross_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(12,2) NOT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wage_settlement_item`
--

LOCK TABLES `wage_settlement_item` WRITE;
/*!40000 ALTER TABLE `wage_settlement_item` DISABLE KEYS */;
/*!40000 ALTER TABLE `wage_settlement_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_report`
--

DROP TABLE IF EXISTS `work_report`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_report` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `process_id` int NOT NULL,
  `worker_id` int DEFAULT NULL,
  `work_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'piece',
  `report_date` date NOT NULL,
  `quantity` int NOT NULL,
  `actual_hours` decimal(10,2) DEFAULT NULL,
  `overtime_hours` decimal(10,2) DEFAULT NULL,
  `piece_price` decimal(10,2) DEFAULT NULL,
  `piece_amount` decimal(12,2) DEFAULT NULL,
  `time_amount` decimal(12,2) DEFAULT NULL,
  `overtime_amount` decimal(12,2) DEFAULT NULL,
  `allowance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deduction` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `confirmed_by` int DEFAULT NULL,
  `confirmed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_task_process` (`task_id`,`process_id`),
  KEY `idx_report_date` (`report_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_report`
--

LOCK TABLES `work_report` WRITE;
/*!40000 ALTER TABLE `work_report` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_report` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `worker`
--

DROP TABLE IF EXISTS `worker`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `worker` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `real_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_id` int DEFAULT NULL,
  `worker_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'piece',
  `hourly_rate` decimal(10,2) DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `isDelete` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `created_by` int DEFAULT NULL,
  `modified_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `worker_worker_code_key` (`worker_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `worker`
--

LOCK TABLES `worker` WRITE;
/*!40000 ALTER TABLE `worker` DISABLE KEYS */;
/*!40000 ALTER TABLE `worker` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'tengxi_pms'
--

--
-- Dumping routines for database 'tengxi_pms'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-29 15:48:47
