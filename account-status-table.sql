CREATE TABLE `panel_metadata` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_name` varchar(50) DEFAULT NULL,
  `manual_update` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

insert into panel_metadata (account_name, manual_update)  values ('reseller.viwopanel.com','No');
insert into panel_metadata (account_name, manual_update)  values ('reseller.viruswoman.com','No');