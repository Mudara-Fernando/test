CREATE TABLE viwo_panel (
    id bigint(20),
    customerName varchar(255),
    code varchar(255),
    domain varchar(45),
    createdDate date,
    planType varchar(40),
    expires date,
    purchasedLicense int(11),
    maxNoSeats int(11),
    isTrial varchar(10),
    trailExpires date,
    renewalType varchar(24),
    lastUpdated date,
    zohoAdmin varchar(45)
);


UPDATE service SET color= '9E42BD' where id = 27;
UPDATE service SET color= '05226F' where id = 28;
UPDATE service SET color= '36DF1B' where id = 29;
UPDATE service SET color= 'E98028' where id = 30;