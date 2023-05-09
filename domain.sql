
DROP TABLE IF EXISTS zoho_domain;

CREATE TABLE `zoho_domain` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `domain` varchar(60) CHARACTER SET ascii NOT NULL,
  `phone` varchar(45) DEFAULT NULL,
  `name` varchar(45) DEFAULT NULL,
  `created_on` datetime DEFAULT NULL,
  `email` varchar(45) DEFAULT NULL,
  `lead_source_id` varchar(45) DEFAULT NULL,
  `type` varchar(45) DEFAULT NULL,
  `industry` varchar(45) DEFAULT NULL,
  `creator_id` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `domain_UNIQUE` (`domain`)
) ENGINE=InnoDB AUTO_INCREMENT=8801 DEFAULT CHARSET=latin1;