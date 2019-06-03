# SQL scripts for incremental updates

# Copyright © 2019 – Katana Cryptographic Ltd. All Rights Reserved.
 
--
-- UPDATES v1.1.0
--

--
-- Create a new table (for test purpose)
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE IF NOT EXISTS `test` (
  `testID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `testValue` varchar(74) DEFAULT NULL,
  PRIMARY KEY (`testID`),
  UNIQUE KEY `testValue` (`testValue`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
